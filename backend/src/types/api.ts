import { LearningPhase, AgentRole, ConceptScore, Reward } from './agents';

export interface MasteryRequest {
  message: string;
  sessionId?: string;
  threadId?: string;
  language?: string;
  adventureMode?: boolean;
}

export interface MasteryProgress {
  currentPhase: LearningPhase;
  currentStep: string;
  currentConcept: string;
  conceptIndex: number;
  totalConcepts: number;
  overallMastery: number;
  conceptScores: Record<string, ConceptScore>;
  inventory: Reward[];
  reviewsDue: number;
  knowledgeGraph: Array<{
    id: string;
    label: string;
    status: 'locked' | 'current' | 'mastered';
    prerequisites: string[];
  }>;
}

export interface MasteryResponse {
  response: string;
  threadId: string;
  sessionId: string;
  currentPhase: LearningPhase;
  currentAgent: AgentRole;
  masteryProgress: MasteryProgress;
}

export interface SessionRecoveryResponse {
  session: {
    sessionId: string;
    threadId: string;
    currentPhase: LearningPhase;
    currentStep: string;
  };
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    agentRole: AgentRole | null;
    timestamp: string;
  }>;
  masteryProgress: MasteryProgress;
}
