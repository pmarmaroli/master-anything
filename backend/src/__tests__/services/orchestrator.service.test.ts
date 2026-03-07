import { OrchestratorService } from '../../services/orchestrator.service';
import { SessionState, AgentRole } from '../../types';

// Mock dependencies
jest.mock('../../services/agent.service');
jest.mock('../../services/session.service');
jest.mock('../../services/mastery.service');
jest.mock('../../services/spaced-repetition.service');

describe('OrchestratorService', () => {
  describe('selectAgent', () => {
    const service = new OrchestratorService();

    function makeSession(overrides: Partial<SessionState> = {}): SessionState {
      return {
        sessionId: 'test',
        threadId: 'thread-1',
        learnerProfile: { level: 'beginner', language: 'en', culturalContext: '', goals: '', assessmentAnswers: [] },
        topicMap: { rootTopic: '', concepts: [], prerequisites: [], knowledgeGraph: [] },
        currentPhase: 'discovery',
        currentStep: 'A1',
        conceptIndex: 0,
        gapRegistry: [],
        masteryScores: {},
        spacedRepetition: [],
        adventureMode: false,
        inventory: [],
        conversationSummary: '',
        messageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      };
    }

    it('should select architect for new session in discovery phase', () => {
      const agent = service.selectAgent(makeSession());
      expect(agent).toBe('architect');
    });

    it('should select architect during diagnosis steps A1-A4', () => {
      expect(service.selectAgent(makeSession({ currentStep: 'A2' }))).toBe('architect');
      expect(service.selectAgent(makeSession({ currentStep: 'A3' }))).toBe('architect');
    });

    it('should select mentor for step B1', () => {
      expect(service.selectAgent(makeSession({ currentPhase: 'learning_loop', currentStep: 'B1' }))).toBe('mentor');
    });

    it('should select challenger for step B2', () => {
      expect(service.selectAgent(makeSession({ currentPhase: 'learning_loop', currentStep: 'B2' }))).toBe('challenger');
    });

    it('should select naive_student for step B3', () => {
      expect(service.selectAgent(makeSession({ currentPhase: 'learning_loop', currentStep: 'B3' }))).toBe('naive_student');
    });

    it('should select evaluator for step B4', () => {
      expect(service.selectAgent(makeSession({ currentPhase: 'learning_loop', currentStep: 'B4' }))).toBe('evaluator');
    });

    it('should select evaluator for validation phase', () => {
      expect(service.selectAgent(makeSession({ currentPhase: 'validation', currentStep: 'C1' }))).toBe('evaluator');
    });
  });
});
