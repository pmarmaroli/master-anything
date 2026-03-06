import { SessionService } from '../../services/session.service';
import { SessionState, ConversationMessage } from '../../types';

// Mock the database module
jest.mock('../../db/connection', () => {
  const mockRequest = {
    input: jest.fn().mockReturnThis(),
    query: jest.fn(),
  };
  const mockPool = {
    request: jest.fn(() => mockRequest),
  };
  return {
    getPool: jest.fn().mockResolvedValue(mockPool),
    __mockRequest: mockRequest,
    __mockPool: mockPool,
  };
});

const { __mockRequest: mockRequest } = require('../../db/connection');

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    service = new SessionService();
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session and return session state', async () => {
      mockRequest.query
        .mockResolvedValueOnce({ recordset: [{ session_id: 'test-123' }] })  // insert session
        .mockResolvedValueOnce({})  // insert learner_profile
        .mockResolvedValueOnce({});  // insert topic_map

      const session = await service.createSession('en');
      expect(session.sessionId).toBe('test-123');
      expect(session.currentPhase).toBe('discovery');
      expect(session.currentStep).toBe('A1');
      expect(session.learnerProfile.language).toBe('en');
    });
  });

  describe('getSession', () => {
    it('should retrieve a full session state', async () => {
      mockRequest.query.mockResolvedValueOnce({
        recordset: [{
          session_id: 'test-123',
          thread_id: 'thread-abc',
          current_phase: 'learning_loop',
          current_step: 'B2',
          concept_index: 3,
          level: 'intermediate',
          language: 'fr',
          cultural_context: '',
          goals: 'master physics',
          assessment_answers: '["answer1"]',
          root_topic: 'Quantum Mechanics',
          concepts: '["concept1","concept2"]',
          prerequisites: '[]',
          knowledge_graph: '[]',
        }],
      });
      mockRequest.query.mockResolvedValueOnce({ recordset: [] }); // mastery scores
      mockRequest.query.mockResolvedValueOnce({ recordset: [] }); // spaced repetition

      const session = await service.getSession('test-123');
      expect(session).not.toBeNull();
      expect(session!.currentPhase).toBe('learning_loop');
      expect(session!.learnerProfile.language).toBe('fr');
    });

    it('should return null for non-existent session', async () => {
      mockRequest.query.mockResolvedValueOnce({ recordset: [] });
      const session = await service.getSession('nonexistent');
      expect(session).toBeNull();
    });
  });

  describe('addMessage', () => {
    it('should insert a conversation message', async () => {
      mockRequest.query.mockResolvedValueOnce({});
      await service.addMessage('test-123', 'user', 'Hello', null);
      expect(mockRequest.input).toHaveBeenCalledWith('sessionId', 'test-123');
      expect(mockRequest.input).toHaveBeenCalledWith('content', 'Hello');
    });
  });
});
