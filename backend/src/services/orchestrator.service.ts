import { AgentService } from './agent.service';
import { SessionService } from './session.service';
import { MasteryService, EvaluatorResult } from './mastery.service';
import { SpacedRepetitionService } from './spaced-repetition.service';
import {
  SessionState,
  AgentRole,
  LearningPhase,
  LearningStep,
  MasteryResponse,
  MasteryProgress,
  HandoffContext,
  Reward,
} from '../types';
import {
  getArchitectPrompt,
  getMentorPrompt,
  getChallengerPrompt,
  getNaiveStudentPrompt,
  getEvaluatorPrompt,
  getOrchestratorPrompt,
  getRendererPrompt,
} from '../agents';

export class OrchestratorService {
  private agentService: AgentService;
  private sessionService: SessionService;
  private masteryService: MasteryService;
  private spacedRepetitionService: SpacedRepetitionService;

  constructor() {
    this.agentService = new AgentService();
    this.sessionService = new SessionService();
    this.masteryService = new MasteryService();
    this.spacedRepetitionService = new SpacedRepetitionService();
  }

  selectAgent(session: SessionState): AgentRole {
    // Check for due spaced repetition reviews
    const dueReviews = this.spacedRepetitionService.getDueItems(session.spacedRepetition) || [];
    if (dueReviews.length > 0 && session.currentStep === 'B5') {
      return 'mentor'; // Conduct review
    }

    switch (session.currentPhase) {
      case 'discovery':
        return 'architect';

      case 'learning_loop':
        switch (session.currentStep) {
          case 'B1': return 'mentor';
          case 'B2': return 'challenger';
          case 'B3': return 'naive_student';
          case 'B4': return 'evaluator';
          case 'B5': return 'orchestrator';
          default: return 'mentor';
        }

      case 'validation':
        switch (session.currentStep) {
          case 'C1': return 'evaluator';
          case 'C2': return 'evaluator';
          case 'C3': return 'orchestrator';
          default: return 'evaluator';
        }

      default:
        return 'architect';
    }
  }

  getSystemPrompt(agent: AgentRole, session: SessionState): string {
    let prompt: string;
    switch (agent) {
      case 'orchestrator': prompt = getOrchestratorPrompt(session); break;
      case 'architect': prompt = getArchitectPrompt(session); break;
      case 'mentor': prompt = getMentorPrompt(session); break;
      case 'challenger': prompt = getChallengerPrompt(session); break;
      case 'naive_student': prompt = getNaiveStudentPrompt(session); break;
      case 'evaluator': prompt = getEvaluatorPrompt(session); break;
      case 'renderer': prompt = getRendererPrompt(session); break;
    }
    // Global rules appended to every agent prompt
    prompt += `

ABSOLUTE RULE FOR DIAGRAMS AND SCHEMAS:
You have TWO visual tools available. Choose the right one:

1. MERMAID — for flowcharts, mind maps, timelines, sequences, class diagrams, org charts.
   Use a mermaid code block (triple backticks followed by "mermaid").
   Examples: graph TD, flowchart LR, sequenceDiagram, timeline, mindmap.

2. SVG — for scientific illustrations, physics diagrams, wave patterns, circuits, geometry, anatomy, or anything that needs actual drawing (curves, shapes, colors, labels).
   Use an svg code block (triple backticks followed by "svg") containing valid SVG markup.
   Start with <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg"> and include shapes, paths, text labels.
   Use colors to distinguish elements. Keep it clear and educational.

NEVER use ASCII art, box drawing characters, arrows made of dashes, or plain text diagrams. The app renders both mermaid and SVG visually — ASCII art will look broken.

3. LATEX — for mathematical equations, fractions, formulas, and expressions.
   Use $inline math$ for inline expressions and $$block math$$ for displayed equations.
   Examples: $a^2 + b^2 = c^2$, $$\\frac{a}{b} = \\frac{c}{d}$$, $\\sqrt{x^2 + y^2}$
   The app renders LaTeX beautifully — ALWAYS use it for math instead of plain text.

BREVITY RULE (CRITICAL): Keep messages SHORT. Maximum 3-4 sentences per message. Ask ONE question, then stop. The learner is a teenager — long messages make them lose interest. Get to the point fast.`;
    if (session.adventureMode) {
      prompt += this.getAdventurePrompt(agent, session.learnerProfile.language);
    }
    // Inject conversation summary if thread was compacted
    if (session.conversationSummary) {
      prompt += `\n\nCONVERSATION SUMMARY (previous exchanges were compacted — use this as context):\n${session.conversationSummary}`;
    }
    return prompt;
  }

  async processMessage(
    message: string,
    sessionId?: string,
    threadId?: string,
    language?: string,
    adventureMode?: boolean
  ): Promise<MasteryResponse> {
    // Get or create session
    let session: SessionState;
    if (sessionId) {
      const existing = await this.sessionService.getSession(sessionId);
      if (!existing) throw new Error(`Session ${sessionId} not found`);
      session = existing;
    } else {
      session = await this.sessionService.createSession(language || 'en');
    }

    if (adventureMode !== undefined && session.adventureMode !== adventureMode) {
      session.adventureMode = adventureMode;
      await this.sessionService.updateSession(session.sessionId, { adventureMode });
    }

    // Create thread if needed
    if (!session.threadId) {
      const newThreadId = await this.agentService.createThread();
      session.threadId = newThreadId;
      await this.sessionService.updateSession(session.sessionId, { threadId: newThreadId });
    }

    // Save user message
    await this.sessionService.addMessage(session.sessionId, 'user', message, null);

    // Select agent and get system prompt
    const selectedAgent = this.selectAgent(session);
    const systemPrompt = this.getSystemPrompt(selectedAgent, session);

    // Wrap message for evaluator to force JSON scoring
    const agentMessage = this.prepareMessage(selectedAgent, message, session);

    // Call agent
    let response = await this.agentService.sendMessage(
      session.threadId,
      selectedAgent,
      agentMessage,
      systemPrompt
    );

    // 2-step rendering: call Renderer for visual enhancement
    if (this.shouldCallRenderer(selectedAgent, response)) {
      const visual = await this.callRenderer(session, response);
      if (visual) response += visual;
    }

    // Save assistant response
    await this.sessionService.addMessage(session.sessionId, 'assistant', response, selectedAgent);

    // Process agent-specific post-actions
    await this.processPostActions(session, selectedAgent, response);

    // Track message count and auto-compact if needed
    session.messageCount += 2;
    await this.sessionService.incrementMessageCount(session.sessionId);
    await this.sessionService.incrementMessageCount(session.sessionId);
    await this.maybeCompactThread(session);

    // Build progress
    const progress = this.buildMasteryProgress(session);

    return {
      response,
      threadId: session.threadId,
      sessionId: session.sessionId,
      currentPhase: session.currentPhase,
      currentAgent: selectedAgent,
      masteryProgress: progress,
    };
  }

  async processMessageStreaming(
    message: string,
    sessionId: string | undefined,
    threadId: string | undefined,
    language: string | undefined,
    adventureMode: boolean | undefined,
    onToken: (token: string) => void
  ): Promise<MasteryResponse> {
    let session: SessionState;
    if (sessionId) {
      const existing = await this.sessionService.getSession(sessionId);
      if (!existing) throw new Error(`Session ${sessionId} not found`);
      session = existing;
    } else {
      session = await this.sessionService.createSession(language || 'en');
    }

    if (adventureMode !== undefined && session.adventureMode !== adventureMode) {
      session.adventureMode = adventureMode;
      await this.sessionService.updateSession(session.sessionId, { adventureMode });
    }

    if (!session.threadId) {
      const newThreadId = await this.agentService.createThread();
      session.threadId = newThreadId;
      await this.sessionService.updateSession(session.sessionId, { threadId: newThreadId });
    }

    await this.sessionService.addMessage(session.sessionId, 'user', message, null);

    const selectedAgent = this.selectAgent(session);
    const systemPrompt = this.getSystemPrompt(selectedAgent, session);

    // Wrap message for evaluator to force JSON scoring
    const agentMessage = this.prepareMessage(selectedAgent, message, session);

    let response = await this.agentService.sendMessageStreaming(
      session.threadId,
      selectedAgent,
      agentMessage,
      systemPrompt,
      onToken
    );

    // 2-step rendering: call Renderer for visual enhancement (streamed)
    if (this.shouldCallRenderer(selectedAgent, response)) {
      const visual = await this.callRenderer(session, response, onToken);
      if (visual) response += visual;
    }

    await this.sessionService.addMessage(session.sessionId, 'assistant', response, selectedAgent);
    await this.processPostActions(session, selectedAgent, response);

    // Track message count and auto-compact if needed
    session.messageCount += 2; // user + assistant
    await this.sessionService.incrementMessageCount(session.sessionId);
    await this.sessionService.incrementMessageCount(session.sessionId);
    await this.maybeCompactThread(session);

    return {
      response,
      threadId: session.threadId,
      sessionId: session.sessionId,
      currentPhase: session.currentPhase,
      currentAgent: selectedAgent,
      masteryProgress: this.buildMasteryProgress(session),
    };
  }

  private async maybeCompactThread(session: SessionState): Promise<void> {
    const COMPACT_THRESHOLD = 20;
    if (session.messageCount < COMPACT_THRESHOLD) return;

    console.log(`[Orchestrator] Compacting thread for session ${session.sessionId} (${session.messageCount} messages)`);

    try {
      // Get recent messages to summarize
      const messages = await this.sessionService.getMessages(session.sessionId);
      const recentMessages = messages.slice(-COMPACT_THRESHOLD);
      const conversationText = recentMessages
        .map(m => `${m.role}: ${m.content.slice(0, 300)}`)
        .join('\n');

      // Build summary using the orchestrator agent
      const summaryPrompt = `Summarize this learning conversation concisely. Include:
- Topic being studied
- Key concepts already covered and mastered
- Current concept being worked on
- Learner's level and main gaps
- Where they are in the learning journey
- Important context the next agent needs to know
Keep it under 500 words. Write in ${session.learnerProfile.language === 'fr' ? 'French' : 'English'}.`;

      const summary = await this.agentService.sendMessage(
        session.threadId,
        'orchestrator',
        `Summarize this conversation:\n${conversationText}`,
        summaryPrompt
      );

      // Create a fresh thread
      const newThreadId = await this.agentService.createThread();

      // Save summary and reset
      session.conversationSummary = summary;
      session.threadId = newThreadId;
      session.messageCount = 0;

      await this.sessionService.updateSession(session.sessionId, { threadId: newThreadId });
      await this.sessionService.saveSummary(session.sessionId, summary, 0);

      console.log(`[Orchestrator] Thread compacted. New thread: ${newThreadId}, summary: ${summary.length} chars`);
    } catch (err) {
      console.warn('[Orchestrator] Thread compaction failed, continuing with current thread:', err);
    }
  }

  private prepareMessage(agent: AgentRole, message: string, session: SessionState): string {
    if (agent === 'evaluator') {
      const concept = session.topicMap.concepts[session.conceptIndex] || 'the current topic';
      const lang = session.learnerProfile.language;
      const fr = lang === 'fr';
      let msg = `${fr ? '[INSTRUCTION SYSTEME] Evalue la reponse de l\'apprenant ci-dessous.' : '[SYSTEM INSTRUCTION] Evaluate the learner response below.'} ${fr ? 'Tu DOIS repondre avec un bloc JSON contenant "scores", "overall", "decision", "feedback", "gaps".' : 'You MUST respond with a JSON code block containing "scores", "overall", "decision", "feedback", "gaps".'} ${fr ? 'Le concept evalue est' : 'The concept being evaluated is'}: "${concept}".

${fr ? 'Reponse de l\'apprenant' : 'Learner response'}: "${message}"`;
      if (session.adventureMode) {
        msg += `\n\nADVENTURE MODE: If decision is "advance", you MUST include a "reward" field in your JSON: { "name": "<creative item name tied to the subject>", "emoji": "<single emoji>", "description": "<1-line flavor text>" }. Make it feel like finding a treasure in an adventure game.`;
      }
      return msg;
    }
    return message;
  }

  private getAdventurePrompt(agent: AgentRole, language: string): string {
    const fr = language === 'fr';
    const personas: Record<string, { role: string; roleFr: string; instruction: string; instructionFr: string }> = {
      architect: {
        role: 'The Cartographer',
        roleFr: 'Le Cartographe',
        instruction: 'You are The Cartographer, a mysterious explorer who maps uncharted territories of knowledge. You reveal the quest map and the zones to explore. Speak with a sense of wonder and discovery. Frame the learning plan as an expedition map with territories to conquer.',
        instructionFr: 'Tu es Le Cartographe, un explorateur mysterieux qui cartographie les territoires inconnus du savoir. Tu reveles la carte de la quete et les zones a explorer. Parle avec un sens de l\'emerveillement et de la decouverte. Presente le plan d\'apprentissage comme une carte d\'expedition avec des territoires a conquerir.',
      },
      mentor: {
        role: 'The Sage',
        roleFr: 'Le Sage',
        instruction: 'You are The Sage, a wise and warm ancient guide. You teach secrets and hidden knowledge with patience and kindness. Use metaphors of exploration and discovery. Frame explanations as unveiling ancient secrets or discovering hidden truths. End messages with a glimpse of what awaits the hero next.',
        instructionFr: 'Tu es Le Sage, un guide ancien, sage et bienveillant. Tu enseignes les secrets et le savoir cache avec patience et gentillesse. Utilise des metaphores d\'exploration et de decouverte. Presente les explications comme la revelation de secrets anciens ou la decouverte de verites cachees. Termine tes messages avec un apercu de ce qui attend le heros.',
      },
      challenger: {
        role: 'The Guardian',
        roleFr: 'Le Gardien',
        instruction: 'You are The Guardian, an imposing but fair figure who blocks the path. You pose riddles and challenges that the hero must solve to advance. Frame your questions as trials or tests of worthiness. Be encouraging even when the hero fails — a true guardian respects effort.',
        instructionFr: 'Tu es Le Gardien, une figure imposante mais juste qui bloque le passage. Tu poses des enigmes et des defis que le heros doit resoudre pour avancer. Presente tes questions comme des epreuves. Sois encourageant meme en cas d\'echec — un vrai gardien respecte l\'effort.',
      },
      naive_student: {
        role: 'The Companion',
        roleFr: 'Le Compagnon',
        instruction: 'You are The Companion, a small curious creature (like a Pikmin) who follows the hero. You ask naive questions with wide-eyed wonder. You don\'t understand big words and need simple explanations. Be adorable, enthusiastic, and sometimes confused. Use expressions like "Ooh!" and "Wait, what?".',
        instructionFr: 'Tu es Le Compagnon, une petite creature curieuse (comme un Pikmin) qui suit le heros. Tu poses des questions naives avec de grands yeux emerveilles. Tu ne comprends pas les mots compliques et tu as besoin d\'explications simples. Sois adorable, enthousiaste, et parfois perdu. Utilise des expressions comme "Ooh !" et "Attends, quoi ?".',
      },
      evaluator: {
        role: 'The Oracle',
        roleFr: 'L\'Oracle',
        instruction: 'You are The Oracle, a mystical being who judges if the hero is worthy to advance. Frame your evaluation as a mystical reading of the hero\'s knowledge aura. When the hero masters a concept, announce the reward dramatically.',
        instructionFr: 'Tu es L\'Oracle, un etre mystique qui juge si le heros est digne d\'avancer. Presente ton evaluation comme une lecture mystique de l\'aura de savoir du heros. Quand le heros maitrise un concept, annonce la recompense de facon dramatique.',
      },
      orchestrator: {
        role: 'The Narrator',
        roleFr: 'Le Narrateur',
        instruction: 'You are The Narrator, the voice that guides transitions in the quest. Announce new chapters, celebrate milestones, and build anticipation for what comes next. Be epic but concise.',
        instructionFr: 'Tu es Le Narrateur, la voix qui guide les transitions dans la quete. Annonce les nouveaux chapitres, celebre les etapes franchies, et cree l\'anticipation pour la suite. Sois epique mais concis.',
      },
      renderer: {
        role: 'The Artisan',
        roleFr: 'L\'Artisan',
        instruction: 'You are The Artisan, a master craftsman who creates quest maps and illustrations. Frame your visuals as artifacts, maps, or magical scrolls. Use a fantasy/adventure aesthetic when appropriate.',
        instructionFr: 'Tu es L\'Artisan, un maitre artisan qui cree des cartes de quete et des illustrations. Presente tes visuels comme des artefacts, des cartes, ou des parchemins magiques. Utilise une esthetique fantasy/aventure quand c\'est approprie.',
      },
    };

    const persona = personas[agent];
    if (!persona) return '';

    const role = fr ? persona.roleFr : persona.role;
    const instruction = fr ? persona.instructionFr : persona.instruction;

    return `\n\nADVENTURE MODE ACTIVE — You are now "${role}".
${instruction}
Keep educational content rigorous — only the tone and framing change.
Tie the narrative to the learning subject (e.g., if studying electricity, reference "the Cave of Electrons", if studying history, reference "traveling through time").
Never break character. Never mention "adventure mode" or "study mode".`;
  }

  private shouldCallRenderer(agent: AgentRole, response: string): boolean {
    // Only enhance teaching agents (mentor, challenger, naive_student)
    if (!['mentor', 'challenger', 'naive_student'].includes(agent)) return false;
    // Skip if response already contains a visual or table
    if (/```(mermaid|svg)/.test(response)) return false;
    if (/\|.+\|.+\|[\s\S]*\|[-:]+\|/.test(response)) return false;
    // Skip very short responses (quick questions, yes/no)
    if (response.length < 200) return false;
    // Trigger on content that would benefit from visualization
    const visualTriggers = /\b(diagram|schema|illustrat|visuali[sz]|concept|process|steps|stages|flow|cycle|structur|compar|hierarchy|relationship|formula|equation|wave|circuit|anatomy|timeline|sequence|architecture|pattern|table|tableau|classif|categor|differ|similar|versus|vs\.?|pros|cons|avantage|inconvenient)/i;
    return visualTriggers.test(response);
  }

  private async callRenderer(
    session: SessionState,
    primaryResponse: string,
    onToken?: (token: string) => void
  ): Promise<string> {
    if (!process.env.RENDERER_AGENT_ID) return '';

    try {
      const rendererPrompt = this.getSystemPrompt('renderer', session);
      const rendererInput = `Based on this educational content, create an appropriate visual (mermaid or SVG):\n\n${primaryResponse.slice(0, 2000)}`;

      let rendererResponse: string;
      if (onToken) {
        // Emit a separator before the visual
        onToken('\n\n');
        rendererResponse = await this.agentService.sendMessageStreaming(
          session.threadId,
          'renderer',
          rendererInput,
          rendererPrompt,
          onToken
        );
      } else {
        rendererResponse = await this.agentService.sendMessage(
          session.threadId,
          'renderer',
          rendererInput,
          rendererPrompt
        );
      }

      // If renderer says no render needed, return empty
      if (rendererResponse.includes('[NO_RENDER]')) return '';

      console.log(`[Orchestrator] Renderer produced ${rendererResponse.length} chars of visual content`);
      return '\n\n' + rendererResponse;
    } catch (err) {
      console.warn('[Orchestrator] Renderer call failed, skipping:', err);
      return '';
    }
  }

  private async processPostActions(
    session: SessionState,
    agent: AgentRole,
    response: string
  ): Promise<void> {
    switch (agent) {
      case 'architect':
        await this.handleArchitectResponse(session, response);
        break;
      case 'evaluator':
        await this.handleEvaluatorResponse(session, response);
        break;
      default:
        await this.advanceStep(session);
        break;
    }
  }

  private async handleArchitectResponse(session: SessionState, response: string): Promise<void> {
    // Always try to extract concepts from any Architect response
    if (session.topicMap.concepts.length === 0) {
      const concepts = this.extractConcepts(response);
      if (concepts.length > 0) {
        console.log(`[Orchestrator] Extracted ${concepts.length} concepts at step ${session.currentStep}:`, concepts);
        session.topicMap.concepts = concepts;
        await this.sessionService.updateTopicMap(session.sessionId, session.topicMap);
      }
    }

    if (session.currentStep === 'A1') {
      await this.sessionService.updateSession(session.sessionId, { currentStep: 'A2' });
      session.currentStep = 'A2';
    } else if (session.currentStep === 'A2') {
      await this.sessionService.updateSession(session.sessionId, { currentStep: 'A3' });
      session.currentStep = 'A3';
    } else if (session.currentStep === 'A3') {
      // Try to extract concepts from the knowledge graph / topic map response
      const concepts = this.extractConcepts(response);
      console.log(`[Orchestrator] A3 extracted ${concepts.length} concepts:`, concepts);
      if (concepts.length > 0) {
        session.topicMap.concepts = concepts;
        await this.sessionService.updateTopicMap(session.sessionId, session.topicMap);
      }
      await this.sessionService.updateSession(session.sessionId, { currentStep: 'A4' });
      session.currentStep = 'A4';
    } else if (session.currentStep === 'A4') {
      // Roadmap presented — also try to extract concepts if not already set
      if (session.topicMap.concepts.length === 0) {
        const concepts = this.extractConcepts(response);
        if (concepts.length > 0) {
          session.topicMap.concepts = concepts;
          await this.sessionService.updateTopicMap(session.sessionId, session.topicMap);
        }
      }
      // Transition to learning loop
      await this.sessionService.updateSession(session.sessionId, {
        currentPhase: 'learning_loop',
        currentStep: 'B1',
      });
      session.currentPhase = 'learning_loop';
      session.currentStep = 'B1';
    }
  }

  private async handleEvaluatorResponse(session: SessionState, response: string): Promise<void> {
    const result = this.masteryService.parseEvaluatorResponse(response);
    console.log(`[Orchestrator] Evaluator parse result:`, result ? `overall=${result.overall}, decision=${result.decision}` : 'FAILED TO PARSE');

    if (result) {
      const concept = session.topicMap.concepts[session.conceptIndex] || '';
      const iterationCount = (session.masteryScores[concept]?.iterationCount || 0) + 1;
      const score = this.masteryService.toConceptScore(result, iterationCount);

      await this.sessionService.upsertMasteryScore(session.sessionId, concept, score);
      session.masteryScores[concept] = score;

      if (result.decision === 'advance') {
        // Add to spaced repetition
        const srItem = this.spacedRepetitionService.createItem(concept);
        session.spacedRepetition.push(srItem);

        // Collect adventure reward if present
        if (session.adventureMode && (result as any).reward) {
          const reward = (result as any).reward;
          const inventoryItem: Reward = {
            name: reward.name || concept,
            emoji: reward.emoji || '🏆',
            description: reward.description || '',
            concept,
          };
          session.inventory.push(inventoryItem);
          await this.sessionService.saveInventory(session.sessionId, session.inventory);
        }

        if (session.conceptIndex + 1 >= session.topicMap.concepts.length) {
          // All concepts mastered — go to validation
          await this.sessionService.updateSession(session.sessionId, {
            currentPhase: 'validation',
            currentStep: 'C1',
          });
          session.currentPhase = 'validation';
          session.currentStep = 'C1';
        } else {
          // Advance to next concept
          const nextIndex = session.conceptIndex + 1;
          await this.sessionService.updateSession(session.sessionId, {
            conceptIndex: nextIndex,
            currentStep: 'B1',
          });
          session.conceptIndex = nextIndex;
          session.currentStep = 'B1';
        }
      } else {
        // Loop back to B1
        await this.sessionService.updateSession(session.sessionId, { currentStep: 'B1' });
        session.currentStep = 'B1';
      }
    } else {
      // Could not parse — default advance step
      await this.advanceStep(session);
    }
  }

  private extractConcepts(response: string): string[] {
    const concepts: string[] = [];

    // Match numbered list items: "1. Concept name", "1) Concept name", "**1.** Concept name"
    const numberedMatches = response.match(/(?:^|\n)\s*\**\d+[.)]\**\s*\**([^*\n:]+)\**/g);
    if (numberedMatches && numberedMatches.length >= 2) {
      for (const match of numberedMatches) {
        const cleaned = match
          .replace(/^\s*\**\d+[.)]\**\s*/, '')
          .replace(/\*\*/g, '')
          .replace(/[:–—].+$/, '') // Remove descriptions after colon or dash
          .trim();
        if (cleaned && cleaned.length > 2 && cleaned.length < 100) {
          concepts.push(cleaned);
        }
      }
    }

    // Fallback: try mermaid node labels like [Concept Name] or (Concept Name)
    if (concepts.length === 0) {
      const mermaidMatches = response.match(/\[([^\]]{3,60})\]/g);
      if (mermaidMatches && mermaidMatches.length >= 2) {
        for (const match of mermaidMatches) {
          const label = match.slice(1, -1).trim();
          if (label && !label.includes('-->') && !label.includes('---')) {
            concepts.push(label);
          }
        }
      }
    }

    return concepts;
  }

  private async advanceStep(session: SessionState): Promise<void> {
    const stepOrder: Record<string, LearningStep> = {
      'B1': 'B2',
      'B2': 'B3',
      'B3': 'B4',
      'B4': 'B1', // Fallback — evaluator normally handles this
      'B5': 'B1',
      'C1': 'C2',
      'C2': 'C3',
    };

    const nextStep = stepOrder[session.currentStep];
    if (nextStep) {
      await this.sessionService.updateSession(session.sessionId, { currentStep: nextStep });
      session.currentStep = nextStep;
    }
  }

  private buildMasteryProgress(session: SessionState): MasteryProgress {
    const scores = session.masteryScores;
    const totalScores = Object.values(scores);
    const overallMastery = totalScores.length > 0
      ? Math.round(totalScores.reduce((sum, s) => sum + s.overall, 0) / totalScores.length)
      : 0;

    const dueReviews = this.spacedRepetitionService.getDueItems(session.spacedRepetition);

    return {
      currentPhase: session.currentPhase,
      currentStep: session.currentStep,
      currentConcept: session.topicMap.concepts[session.conceptIndex] || '',
      conceptIndex: session.conceptIndex,
      totalConcepts: session.topicMap.concepts.length,
      overallMastery,
      conceptScores: scores,
      inventory: session.inventory || [],
      reviewsDue: dueReviews.length,
      knowledgeGraph: session.topicMap.knowledgeGraph,
    };
  }
}
