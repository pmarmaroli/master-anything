export type AgentRole =
  | 'orchestrator'
  | 'architect'
  | 'mentor'
  | 'challenger'
  | 'naive_student'
  | 'evaluator'
  | 'renderer';

export type LearningPhase = 'discovery' | 'learning_loop' | 'validation';

export type LearningStep =
  | 'A1' | 'A2' | 'A3' | 'A4'   // Discovery
  | 'B1' | 'B2' | 'B3' | 'B4' | 'B5'  // Learning Loop
  | 'C1' | 'C2' | 'C3';          // Validation

export interface AgentConfig {
  role: AgentRole;
  agentId: string;
  systemPromptTemplate: string;
}

export interface HandoffContext {
  learnerMessage: string;
  currentPhase: LearningPhase;
  currentStep: LearningStep;
  currentConcept: string;
  masteryScores: Record<string, ConceptScore>;
  gapRegistry: KnowledgeGap[];
  language: string;
  instruction: string;
  toneGuidance: string;
}

export interface ConceptScore {
  clarity: number;
  reasoning: number;
  simplification: number;
  connection: number;
  overall: number;
  iterationCount: number;
}

export interface KnowledgeGap {
  concept: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  iterationsAttempted: number;
}

export interface Reward {
  name: string;
  emoji: string;
  description: string;
  concept: string;
}
