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
} from '../types';
import {
  getArchitectPrompt,
  getMentorPrompt,
  getChallengerPrompt,
  getNaiveStudentPrompt,
  getEvaluatorPrompt,
  getOrchestratorPrompt,
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
    }
    // Global rules appended to every agent prompt
    prompt += `

ABSOLUTE RULE FOR DIAGRAMS AND SCHEMAS:
When asked to create any diagram, schema, chart, or visual representation, you MUST use mermaid syntax inside a mermaid code block (starting with triple backticks followed by "mermaid"). Examples of valid mermaid types: graph TD, flowchart LR, sequenceDiagram, timeline, mindmap, classDiagram.
NEVER use ASCII art, box drawing characters, arrows made of dashes, or plain text diagrams. The app renders mermaid code as interactive visual diagrams — ASCII art will look broken.`;
    return prompt;
  }

  async processMessage(
    message: string,
    sessionId?: string,
    threadId?: string,
    language?: string
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

    // Call agent
    const response = await this.agentService.sendMessage(
      session.threadId,
      selectedAgent,
      message,
      systemPrompt
    );

    // Save assistant response
    await this.sessionService.addMessage(session.sessionId, 'assistant', response, selectedAgent);

    // Process agent-specific post-actions
    await this.processPostActions(session, selectedAgent, response);

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

    if (!session.threadId) {
      const newThreadId = await this.agentService.createThread();
      session.threadId = newThreadId;
      await this.sessionService.updateSession(session.sessionId, { threadId: newThreadId });
    }

    await this.sessionService.addMessage(session.sessionId, 'user', message, null);

    const selectedAgent = this.selectAgent(session);
    const systemPrompt = this.getSystemPrompt(selectedAgent, session);

    const response = await this.agentService.sendMessageStreaming(
      session.threadId,
      selectedAgent,
      message,
      systemPrompt,
      onToken
    );

    await this.sessionService.addMessage(session.sessionId, 'assistant', response, selectedAgent);
    await this.processPostActions(session, selectedAgent, response);

    return {
      response,
      threadId: session.threadId,
      sessionId: session.sessionId,
      currentPhase: session.currentPhase,
      currentAgent: selectedAgent,
      masteryProgress: this.buildMasteryProgress(session),
    };
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
    if (session.currentStep === 'A1') {
      await this.sessionService.updateSession(session.sessionId, { currentStep: 'A2' });
      session.currentStep = 'A2';
    } else if (session.currentStep === 'A2') {
      await this.sessionService.updateSession(session.sessionId, { currentStep: 'A3' });
      session.currentStep = 'A3';
    } else if (session.currentStep === 'A3') {
      // Try to extract concepts from the knowledge graph / topic map response
      const concepts = this.extractConcepts(response);
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
      reviewsDue: dueReviews.length,
      knowledgeGraph: session.topicMap.knowledgeGraph,
    };
  }
}
