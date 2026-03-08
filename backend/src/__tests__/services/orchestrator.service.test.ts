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
        adventureState: {
          mode: 'study', dungeon_map_revealed: false, current_boss: null,
          boss_hp: 100, boss_max_hp: 100, bosses_defeated: [], loot_inventory: [],
          total_damage_dealt: 0, current_room: 0, total_rooms: 0,
          wall_blocks_remaining: 0, wall_blocks_total: 0, streak: 0,
        },
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

  describe('shouldCallRenderer', () => {
    const service = new OrchestratorService() as any;

    it('returns false for non-mentor agents', () => {
      const longResponse = 'A long response about circuits and diagrams with content. '.repeat(10);
      expect(service.shouldCallRenderer('architect', longResponse)).toBe(false);
      expect(service.shouldCallRenderer('challenger', longResponse)).toBe(false);
    });

    it('returns false if response already has a mermaid block', () => {
      expect(service.shouldCallRenderer('mentor', 'Content\n```mermaid\ngraph TD\n```')).toBe(false);
    });

    it('returns false if response already has an svg block', () => {
      expect(service.shouldCallRenderer('mentor', 'Content\n```svg\n<svg></svg>\n```')).toBe(false);
    });

    it('returns false if response already has a jsxgraph block', () => {
      expect(service.shouldCallRenderer('mentor', 'Graph:\n```jsxgraph\nvar board = JXG.JSXGraph.initBoard(...);\n```')).toBe(false);
    });

    it('returns false if response already has a circuit block', () => {
      expect(service.shouldCallRenderer('mentor', 'Circuit:\n```circuit\n{"components":[]}\n```')).toBe(false);
    });

    it('returns false if response already has a kekule block', () => {
      expect(service.shouldCallRenderer('mentor', 'Molecule:\n```kekule\nCCO\n```')).toBe(false);
    });

    it('returns false if response already has a matterjs block', () => {
      expect(service.shouldCallRenderer('mentor', 'Physics:\n```matterjs\nvar engine = Matter.Engine.create();\n```')).toBe(false);
    });

    it('returns false if response is too short', () => {
      expect(service.shouldCallRenderer('mentor', 'Short response with circuit diagram.')).toBe(false);
    });
  });

  describe('getEngagementTip', () => {
    const service = new OrchestratorService();

    it('should return topic selection tip for step A1', () => {
      const tip = service.getEngagementTip('A1', '');
      expect(tip).toContain('Choose a topic');
    });

    it('should include concept name in B1 tip', () => {
      const tip = service.getEngagementTip('B1', 'Photosynthesis');
      expect(tip).toContain('Photosynthesis');
      expect(tip).toContain('Explain');
    });

    it('should include concept name in B2 tip', () => {
      const tip = service.getEngagementTip('B2', 'Gravity');
      expect(tip).toContain('Gravity');
      expect(tip).toContain('challenge');
    });

    it('should include concept name in B3 tip', () => {
      const tip = service.getEngagementTip('B3', 'Mitosis');
      expect(tip).toContain('Mitosis');
      expect(tip).toContain('Simplify');
    });

    it('should return scoring tip for B4', () => {
      const tip = service.getEngagementTip('B4', 'Friction');
      expect(tip).toContain('scored');
    });

    it('should return completion tip for C3', () => {
      const tip = service.getEngagementTip('C3', '');
      expect(tip).toContain('mastery journey');
    });

    it('should return a fallback tip for unknown steps', () => {
      const tip = service.getEngagementTip('Z9', '');
      expect(tip).toContain('progress');
    });
  });
});
