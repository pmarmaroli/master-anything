export type LearningPhase = 'discovery' | 'learning_loop' | 'validation';
export type AgentRole = 'orchestrator' | 'architect' | 'mentor' | 'challenger' | 'naive_student' | 'evaluator';

export interface ConceptScore {
  clarity: number;
  reasoning: number;
  simplification: number;
  connection: number;
  overall: number;
  iterationCount: number;
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  status: 'locked' | 'current' | 'mastered';
  prerequisites: string[];
}

export interface MasteryProgress {
  currentPhase: LearningPhase;
  currentStep: string;
  currentConcept: string;
  conceptIndex: number;
  totalConcepts: number;
  overallMastery: number;
  conceptScores: Record<string, ConceptScore>;
  reviewsDue: number;
  knowledgeGraph: KnowledgeGraphNode[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentRole: AgentRole | null;
  timestamp: string;
}

export interface SSEEvent {
  type: 'token' | 'done' | 'error';
  content?: string;
  response?: string;
  threadId?: string;
  sessionId?: string;
  currentPhase?: LearningPhase;
  currentAgent?: AgentRole;
  masteryProgress?: MasteryProgress;
  error?: string;
}
