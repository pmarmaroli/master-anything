import { AgentRole, LearningPhase, LearningStep, ConceptScore, KnowledgeGap, Reward, AdventureState } from './agents';

export interface LearnerProfile {
  level: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  culturalContext: string;
  goals: string;
  assessmentAnswers: string[];
}

export interface TopicMap {
  rootTopic: string;
  concepts: string[];
  prerequisites: string[];
  knowledgeGraph: KnowledgeGraphNode[];
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  status: 'locked' | 'current' | 'mastered';
  prerequisites: string[];
}

export interface SpacedRepetitionItem {
  concept: string;
  nextReviewAt: Date;
  interval: number;
  easeFactor: number;
  reviewCount: number;
}

export interface SessionState {
  sessionId: string;
  threadId: string;
  learnerProfile: LearnerProfile;
  topicMap: TopicMap;
  currentPhase: LearningPhase;
  currentStep: LearningStep;
  conceptIndex: number;
  gapRegistry: KnowledgeGap[];
  masteryScores: Record<string, ConceptScore>;
  spacedRepetition: SpacedRepetitionItem[];
  adventureMode: boolean;
  inventory: Reward[];
  adventureState: AdventureState;
  conversationSummary: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  agentRole: AgentRole | null;
  timestamp: Date;
}
