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
  AdventureEvent,
  AdventureEventType,
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
      prompt += this.getAdventurePrompt(agent, session);
      // Repeat brevity rule at the very end — LLMs give more weight to last instructions
      prompt += `

=== FINAL MANDATORY RULE ===
YOUR RESPONSE MUST BE 2-3 SENTENCES MAXIMUM. STOP AFTER ONE QUESTION OR CHOICE.
DO NOT combine a reaction + explanation + question in the same message.
If you want to say more, use [SPLIT] to break into separate short messages.
THIS IS THE MOST IMPORTANT RULE. VIOLATING IT BREAKS THE GAME.`;
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
    const evalResult = await this.processPostActions(session, selectedAgent, response);

    // Initialize adventure state before event generation
    if (session.adventureMode) {
      if (session.currentPhase === 'learning_loop' && session.adventureState.current_boss !== session.topicMap.concepts[session.conceptIndex]) {
        session.adventureState.current_boss = session.topicMap.concepts[session.conceptIndex] || null;
        session.adventureState.boss_hp = 100;
      }
      if (session.currentPhase === 'validation' && session.adventureState.wall_blocks_total === 0) {
        session.adventureState.wall_blocks_total = session.topicMap.concepts.length;
        session.adventureState.wall_blocks_remaining = session.topicMap.concepts.length;
      }
      if (session.adventureState.total_rooms === 0 && session.topicMap.concepts.length > 0) {
        session.adventureState.total_rooms = session.topicMap.concepts.length;
      }
    }

    // Generate adventure event
    const adventureEvent = this.generateAdventureEvent(session, selectedAgent, evalResult);
    if (session.adventureMode) {
      this.sessionService.saveAdventureState(session.sessionId, session.adventureState).catch(() => {});
    }

    // Track message count and auto-compact in background (non-blocking)
    session.messageCount += 2;
    this.sessionService.incrementMessageCount(session.sessionId).catch(() => {});
    this.sessionService.incrementMessageCount(session.sessionId).catch(() => {});
    this.maybeCompactThread(session).catch(err => console.warn('[Orchestrator] Background compaction error:', err));

    // Build progress
    const progress = this.buildMasteryProgress(session);

    return {
      response,
      threadId: session.threadId,
      sessionId: session.sessionId,
      currentPhase: session.currentPhase,
      currentAgent: selectedAgent,
      masteryProgress: progress,
      adventure: adventureEvent,
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

    // Evaluator returns a JSON scoring block — never stream it raw to the user.
    // Capture without streaming, parse, then emit only the feedback text.
    let response: string;
    if (selectedAgent === 'evaluator') {
      response = await this.agentService.sendMessage(
        session.threadId,
        selectedAgent,
        agentMessage,
        systemPrompt
      );
      const parsed = this.masteryService.parseEvaluatorResponse(response);
      if (parsed?.feedback) {
        onToken(parsed.feedback);
      }
    } else {
      response = await this.agentService.sendMessageStreaming(
        session.threadId,
        selectedAgent,
        agentMessage,
        systemPrompt,
        onToken
      );
    }

    // 2-step rendering: call Renderer for visual enhancement (streamed)
    if (this.shouldCallRenderer(selectedAgent, response)) {
      const visual = await this.callRenderer(session, response, onToken);
      if (visual) response += visual;
    }

    await this.sessionService.addMessage(session.sessionId, 'assistant', response, selectedAgent);
    const evalResult = await this.processPostActions(session, selectedAgent, response);

    // Initialize adventure state before event generation
    if (session.adventureMode) {
      // Initialize boss state when entering learning loop with a new concept
      if (session.currentPhase === 'learning_loop' && session.adventureState.current_boss !== session.topicMap.concepts[session.conceptIndex]) {
        session.adventureState.current_boss = session.topicMap.concepts[session.conceptIndex] || null;
        session.adventureState.boss_hp = 100;
      }
      // Initialize wall state when entering validation
      if (session.currentPhase === 'validation' && session.adventureState.wall_blocks_total === 0) {
        session.adventureState.wall_blocks_total = session.topicMap.concepts.length;
        session.adventureState.wall_blocks_remaining = session.topicMap.concepts.length;
      }
      // Set total rooms from concepts
      if (session.adventureState.total_rooms === 0 && session.topicMap.concepts.length > 0) {
        session.adventureState.total_rooms = session.topicMap.concepts.length;
      }
    }

    // Generate adventure event
    const adventureEvent = this.generateAdventureEvent(session, selectedAgent, evalResult);
    if (session.adventureMode) {
      this.sessionService.saveAdventureState(session.sessionId, session.adventureState).catch(() => {});
    }

    // Track message count and auto-compact in background (non-blocking)
    session.messageCount += 2; // user + assistant
    this.sessionService.incrementMessageCount(session.sessionId).catch(() => {});
    this.sessionService.incrementMessageCount(session.sessionId).catch(() => {});
    this.maybeCompactThread(session).catch(err => console.warn('[Orchestrator] Background compaction error:', err));

    return {
      response,
      threadId: session.threadId,
      sessionId: session.sessionId,
      currentPhase: session.currentPhase,
      currentAgent: selectedAgent,
      masteryProgress: this.buildMasteryProgress(session),
      adventure: adventureEvent,
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

  private getAdventurePrompt(agent: AgentRole, session: SessionState): string {
    const globalRules = `

ADVENTURE MODE ACTIVE — You are in a pixel-art dungeon RPG learning experience.

ABSOLUTE LENGTH RULE:
- NEVER exceed 3 sentences per message. No exceptions.
- If you need more, split with [SPLIT] markers. Each chunk = 2-3 sentences max.
- EXCEPTION: mermaid diagrams and code blocks are FULLY EXEMPT — always output them completely, never truncate.

TONE — TEEN RULES (13-15 year olds):
- Talk like a smart older friend in a video game, NOT a teacher
- Casual language: "OK so basically...", "ngl this part is tricky", "let's go", "not gonna lie"
- NEVER say: "Excellent!", "Great job!", "Well done!", "That's correct!" — teacher words are banned
- INSTEAD say: "OK yeah you got it", "clean hit", "nailed it", "that landed"
- NEVER use: "Let's explore", "Let's dive into", "Let's delve", "fascinating" — AI-speak is banned
- Use emojis sparingly (1-2 per message max, not every message)
- Match the learner's energy and language

GAME METAPHORS — Use these consistently:
- Concepts = Bosses to defeat
- Good explanations = Sword strikes / attacks that deal damage
- Challenger questions = Boss counter-attacks the learner must dodge/block
- Simplification for Naive Student = Final blow / finishing move
- Mastery achieved = Boss defeated, loot dropped
- Knowledge gaps = Boss's armor / weak spots to find
- Roadmap = Dungeon map with rooms

INTERACTION RULES:
- EVERY message must end with ONE of:
  a) A direct question (one only)
  b) A choice: "A) ... B) ... C) ..."
  c) A dare/challenge: "bet you can't one-shot this"
  d) A provocative statement: "most people wipe on this part btw"
- NEVER end with vague "what do you think?"
- NEVER ask "do you have any questions?"

SESSION PACING:
- Think in 3-5 minute rounds
- After 4-5 exchanges: "you've been clearing rooms for like 3 min and you already took down [X]. Keep going?"
- Create micro-goals: "let's see if you can drop this boss in 3 hits"

Always respond in the same language the learner writes in.
Never reveal the multi-agent architecture. Use "I" consistently.
You are the learner's companion in this dungeon — like a guide NPC in an RPG.`;

    const agentPrompts: Record<string, string> = {
      architect: `
You are the Architect — you scout the dungeon and reveal the map.

A1 — Dungeon Entry:
- "You just stepped into the dungeon. It's dark and full of bosses. What topic are we conquering today?"
- If too broad: "That's a massive dungeon — want to start with [area A] or [area B]?"

A2 — Scouting (diagnosis as room exploration):
- Each question = opening a door: "Let's check what's behind this door... Do you already know what [concept] is? A) Yeah B) Kinda C) Nope"
- ONE question per message. Never two.
- Make it feel like exploring, not testing.

A3 — Map Reveal:
- Output a mermaid diagram as a dungeon map (ALWAYS output the full diagram — diagrams are exempt from the sentence limit)
- REQUIRED format: every node MUST use NodeID[Concept Name] syntax, e.g. A[Photosynthesis] --> B[Light Reactions]
- Keep it to 5-8 nodes max with short labels (no emoji inside node labels)

A4 — Boss List:
- Present as a hit list: "OK here's your target list. [X] bosses:"
- "First target: [concept]. Ready to fight?"`,

      mentor: `
You are the Mentor — the learner's combat guide. You teach them how to fight each boss.

BOSS FIGHT — STEP B1:
Introducing the boss:
- "Alright, [Concept] boss just appeared. Here's what you need to know to take it down:"
- Give a SHORT explanation (2-3 sentences max) using analogies from teen life

Asking them to attack:
- "Your turn — explain [concept] back to me like you're teaching your friend who has zero clue. That's your first strike"
- OR: "Hit this boss with an explanation. Pretend you're making a 30-second TikTok about [concept]."

After their explanation:
- Good hit: "Clean hit — that did solid damage. The boss felt that."
- Partial hit: "That landed but didn't do full damage — you missed [specific gap]. Try hitting it from this angle: [hint]"
- Miss: "That bounced off the boss's armor. Here's the weak spot: [specific help]. Try again"`,

      challenger: `
You are the Challenger — you ARE the boss counter-attacking.

STEP B2 — BOSS COUNTER-ATTACK:
Your questions are the boss fighting back:
- "The boss strikes back — why does [thing] happen instead of [other thing]? Block this!"
- "Counter-attack incoming — what if [edge case]? Can you handle it?"

REACTIONS:
- They dodge (good answer): "Blocked it clean. The boss is staggering — press your advantage"
- They get hit (bad answer): "That one got through. Here's a hint: think about [clue]. Counter?"
ONE attack per message. Always end with the strike.`,

      naive_student: `
You are the Naive Student — you're the FINAL BLOW mechanic. If the learner can explain it simply enough for you, it's a finishing move.

STEP B3 — FINISHING MOVE:
- "The boss is low HP — time for the finishing move. But you gotta explain [concept] so simply that even I get it. Go"

Your confusion is the boss's last defense:
- "Wait what?? Say it simpler!"
- "I swung but missed — what even is [term] in normal words?"

When they nail it:
- "OHHHH I get it now — FINISHING BLOW"

MAX 2 sentences per message. ONE confused question per message.`,

      evaluator: `
You are the Evaluator — you determine if the boss lives or dies.

CRITICAL: You MUST still output the JSON code block with scores, overall, decision, feedback, gaps — the system needs it to function. This is mandatory even in Adventure Mode.

In the "feedback" field of the JSON, use adventure-flavored text instead of academic language:
- Score >= 85 (decision: "advance"): feedback = "BOSS DESTROYED [Concept] is down. You picked up [loot]! [X] bosses left."
- Score 60-84 (decision: "loop_back"): feedback = "The boss is hurt but not dead — it's regenerating. [specific gap]. One more round."
- Score < 60 (decision: "teach_more"): feedback = "This boss tanked your hits. [specific help]. Back at it?"

Do NOT show numeric scores in your text outside the JSON. The JSON handles scoring internally.`,

      orchestrator: `
You are the Orchestrator — the dungeon master who controls the flow.
Manage phase transitions as dungeon progression.
- Between bosses: "Boss down. Loot acquired. Next room has [concept]. Scarier than the last one. Let's go?"
- Starting a boss: "[Concept] boss appears! Your move — explain [concept] and deal your first hit"
- Session end: "Dungeon run complete. [X] bosses slain, [Y] loot collected. Come back to finish the rest?"`,

      renderer: `
Same rendering logic as Study Mode, but with pixel-art aesthetic:
- SVGs should use blocky shapes, limited color palettes, thick outlines
- Use darker backgrounds (#1a1a2e, #16213e) with bright accents (#e94560, #00ff88, #ffbd39)
- Diagrams should feel like they belong in a retro game`,
    };

    return globalRules + (agentPrompts[agent] || '');
  }

  private shouldCallRenderer(agent: AgentRole, response: string): boolean {
    // Only enhance mentor (the teaching agent) — skip challenger/naive_student for speed
    if (agent !== 'mentor') return false;
    // Skip if response already contains a visual or table
    if (/```(mermaid|svg|jsxgraph|circuit|kekule|matterjs)/.test(response)) return false;
    if (/\|.+\|.+\|[\s\S]*\|[-:]+\|/.test(response)) return false;
    // Skip short responses
    if (response.length < 300) return false;
    // Only trigger on content that EXPLICITLY needs a diagram — much stricter
    const visualTriggers = /\b(diagram|schema|illustrat|visuali[sz]|circuit|anatomy|formula|equation|tableau|graph)\b/i;
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
      const rendererInput = `Based on this educational content, create an appropriate visual using the correct library format:\n- jsxgraph: geometry, math, functions, calculus, optics\n- circuit JSON: electronics, circuits, logic gates\n- kekule (SMILES string): chemistry molecules and structures\n- matterjs: physics simulations (gravity, pendulum, springs)\n- mermaid: flowcharts, timelines, mind maps\n\nContent:\n${primaryResponse.slice(0, 2000)}`;

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
  ): Promise<any> {
    switch (agent) {
      case 'architect':
        await this.handleArchitectResponse(session, response);
        return null;
      case 'evaluator':
        return await this.handleEvaluatorResponse(session, response);
      default:
        await this.advanceStep(session);
        return null;
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

  private async handleEvaluatorResponse(session: SessionState, response: string): Promise<any> {
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
    return result;
  }

  private extractConcepts(response: string): string[] {
    const seen = new Set<string>();
    const add = (s: string) => {
      const c = s.replace(/\*\*/g, '').replace(/[:–—].+$/, '').trim();
      if (c && c.length > 2 && c.length < 100 && !seen.has(c.toLowerCase())) {
        seen.add(c.toLowerCase());
      }
    };

    // Strategy 1: numbered list items "1. Concept", "1) Concept", "**1.** Concept"
    const numberedMatches = response.match(/(?:^|\n)\s*\**\d+[.)]\**\s*\**([^*\n:]+)\**/g);
    if (numberedMatches) {
      for (const match of numberedMatches) {
        add(match.replace(/^\s*\**\d+[.)]\**\s*/, ''));
      }
    }

    // Strategy 2: mermaid node labels NodeID[Label] — required format in A3
    const mermaidBracket = response.match(/\w+\[([^\]"]{3,60})\]/g);
    if (mermaidBracket) {
      for (const match of mermaidBracket) {
        const label = match.replace(/^\w+\[/, '').slice(0, -1).trim();
        if (label && !label.includes('-->')) add(label);
      }
    }

    // Strategy 3: mermaid quoted labels NodeID["Label"]
    const mermaidQuoted = response.match(/\w+\["([^"]{3,60})"\]/g);
    if (mermaidQuoted) {
      for (const match of mermaidQuoted) {
        const label = match.replace(/^\w+\["/, '').replace(/"\]$/, '').trim();
        if (label) add(label);
      }
    }

    // Strategy 4: bullet list items "- Concept" or "• Concept"
    const bulletMatches = response.match(/(?:^|\n)\s*[-•]\s+\**([^*\n:]{3,80})\**/g);
    if (bulletMatches) {
      for (const match of bulletMatches) {
        add(match.replace(/^\s*[-•]\s+/, ''));
      }
    }

    // Strategy 5: bold terms **Concept** (standalone, not in a sentence)
    const boldMatches = response.match(/\*\*([^*]{3,60})\*\*/g);
    if (boldMatches) {
      for (const match of boldMatches) {
        const label = match.replace(/\*\*/g, '').trim();
        if (label && label.split(' ').length <= 6) add(label);
      }
    }

    const concepts = Array.from(seen);
    // Re-capitalise first letter
    return concepts.map(c => c.charAt(0).toUpperCase() + c.slice(1));
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

  private generateAdventureEvent(session: SessionState, agent: AgentRole, evaluatorResult?: any): AdventureEvent | undefined {
    if (!session.adventureMode) return undefined;

    const state = session.adventureState;
    const totalConcepts = session.topicMap.concepts.length || 1;
    const roomProgress = `${state.current_room}/${state.total_rooms || totalConcepts}`;
    const wallProgress = `${state.wall_blocks_total - state.wall_blocks_remaining}/${state.wall_blocks_total}`;

    const base: AdventureEvent = {
      event: null,
      boss_hp: state.boss_hp,
      damage_dealt: 0,
      loot: null,
      room_progress: roomProgress,
      wall_progress: wallProgress,
    };

    // Phase A events
    if (session.currentPhase === 'discovery') {
      if (session.currentStep === 'A2') {
        return { ...base, event: 'door_opened' };
      }
      if (session.currentStep === 'A3') {
        state.dungeon_map_revealed = true;
        state.total_rooms = totalConcepts;
        return { ...base, event: 'map_revealed', room_progress: `0/${totalConcepts}` };
      }
      if (session.currentStep === 'A4') {
        state.current_room = 1;
        state.current_boss = session.topicMap.concepts[0] || null;
        state.boss_hp = 100;
        return { ...base, event: null, room_progress: `1/${totalConcepts}` };
      }
    }

    // Phase B events
    if (session.currentPhase === 'learning_loop') {
      if (agent === 'mentor' && session.currentStep === 'B2') {
        // Mentor phase done → learner explained → damage dealt
        const damage = 20 + Math.floor(Math.random() * 16); // 20-35
        state.boss_hp = Math.max(0, state.boss_hp - damage);
        state.total_damage_dealt += damage;
        return { ...base, event: 'boss_damage', boss_hp: state.boss_hp, damage_dealt: damage };
      }
      if (agent === 'challenger' && session.currentStep === 'B3') {
        return { ...base, event: 'boss_counterattack', boss_hp: state.boss_hp };
      }
      if (agent === 'naive_student' && session.currentStep === 'B4') {
        // Finishing move attempt
        const damage = 25 + Math.floor(Math.random() * 16); // 25-40
        state.boss_hp = Math.max(0, state.boss_hp - damage);
        state.total_damage_dealt += damage;
        return { ...base, event: 'boss_damage', boss_hp: state.boss_hp, damage_dealt: damage };
      }
      if (agent === 'evaluator') {
        if (evaluatorResult && evaluatorResult.decision === 'advance') {
          // Boss defeated
          const concept = session.topicMap.concepts[session.conceptIndex] || '';
          state.boss_hp = 0;
          state.bosses_defeated.push(concept);
          state.current_room = session.conceptIndex + 2; // next room
          const lootItem = evaluatorResult.reward
            ? { name: evaluatorResult.reward.name, icon: evaluatorResult.reward.emoji }
            : { name: concept, icon: '💎' };
          state.loot_inventory.push({ ...lootItem, concept });
          state.streak++;
          return {
            ...base,
            event: 'boss_defeated',
            boss_hp: 0,
            damage_dealt: state.boss_hp,
            loot: lootItem,
            room_progress: `${state.current_room}/${state.total_rooms || totalConcepts}`,
          };
        } else if (evaluatorResult && evaluatorResult.overall >= 60) {
          // Boss survives with low HP
          state.boss_hp = Math.min(30, state.boss_hp);
          return { ...base, event: 'boss_damage', boss_hp: state.boss_hp, damage_dealt: 10 };
        } else if (evaluatorResult) {
          // Boss resets
          state.boss_hp = 60;
          state.streak = 0;
          return { ...base, event: 'boss_counterattack', boss_hp: 60 };
        }
      }
    }

    // Phase C events
    if (session.currentPhase === 'validation') {
      if (evaluatorResult && evaluatorResult.decision === 'advance') {
        state.wall_blocks_remaining = Math.max(0, state.wall_blocks_remaining - 1);
        if (state.wall_blocks_remaining === 0) {
          return { ...base, event: 'wall_destroyed', wall_progress: `${state.wall_blocks_total}/${state.wall_blocks_total}` };
        }
        return {
          ...base,
          event: 'wall_block_destroyed',
          wall_progress: `${state.wall_blocks_total - state.wall_blocks_remaining}/${state.wall_blocks_total}`,
        };
      }
    }

    return base;
  }

  static getEngagementTip(step: string, concept: string): string {
    const tips: Record<string, string> = {
      'A1': '🎯 Goal: Choose a topic to master',
      'A2': '🔍 Goal: Show what you already know',
      'A3': '🗺️ Goal: Review your learning roadmap',
      'A4': '🚀 Goal: Get ready to start learning',
      'B1': `💡 Goal: Explain "${concept}" in your own words`,
      'B2': `🛡️ Goal: Answer the challenge question about "${concept}"`,
      'B3': `🎯 Goal: Simplify "${concept}" so anyone can understand`,
      'B4': `📊 Goal: Your explanation of "${concept}" is being scored`,
      'B5': `🔄 Goal: Review previous concepts before moving on`,
      'C1': `✅ Goal: Prove your mastery of "${concept}"`,
      'C2': `✅ Goal: Final validation of "${concept}"`,
      'C3': '🏆 Goal: Complete your mastery journey',
    };
    return tips[step] || '📚 Keep going — you are making progress!';
  }

  private buildMasteryProgress(session: SessionState): MasteryProgress {
    const scores = session.masteryScores;
    const totalScores = Object.values(scores);
    const overallMastery = totalScores.length > 0
      ? Math.round(totalScores.reduce((sum, s) => sum + s.overall, 0) / totalScores.length)
      : 0;

    const dueReviews = this.spacedRepetitionService.getDueItems(session.spacedRepetition);
    const currentConcept = session.topicMap.concepts[session.conceptIndex] || '';

    return {
      currentPhase: session.currentPhase,
      currentStep: session.currentStep,
      currentConcept,
      conceptIndex: session.conceptIndex,
      totalConcepts: session.topicMap.concepts.length,
      overallMastery,
      conceptScores: scores,
      inventory: session.inventory || [],
      reviewsDue: dueReviews.length,
      knowledgeGraph: session.topicMap.knowledgeGraph,
      engagementTip: OrchestratorService.getEngagementTip(session.currentStep, currentConcept),
    };
  }
}
