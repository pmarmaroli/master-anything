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

export interface AdventureState {
  mode: 'adventure' | 'study';
  dungeon_map_revealed: boolean;
  current_boss: string | null;
  boss_hp: number;
  boss_max_hp: number;
  bosses_defeated: string[];
  loot_inventory: { name: string; icon: string; concept: string }[];
  total_damage_dealt: number;
  current_room: number;
  total_rooms: number;
  wall_blocks_remaining: number;
  wall_blocks_total: number;
  streak: number;
}
