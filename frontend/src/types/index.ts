export type LearningPhase = 'discovery' | 'learning_loop' | 'validation';
export type AgentRole = 'orchestrator' | 'architect' | 'mentor' | 'challenger' | 'naive_student' | 'evaluator' | 'renderer';

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

export interface Reward {
  name: string;
  emoji: string;
  description: string;
  concept: string;
}

export type AdventureEventType =
  | 'boss_damage'
  | 'boss_defeated'
  | 'boss_counterattack'
  | 'door_opened'
  | 'map_revealed'
  | 'wall_block_destroyed'
  | 'wall_destroyed'
  | 'loot_drop'
  | null;

export interface AdventureEvent {
  event: AdventureEventType;
  boss_hp: number;
  damage_dealt: number;
  loot: { name: string; icon: string } | null;
  room_progress: string;
  wall_progress: string;
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
  inventory: Reward[];
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
  adventure?: AdventureEvent;
  error?: string;
}
