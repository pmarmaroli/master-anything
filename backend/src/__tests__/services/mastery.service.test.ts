import { MasteryService } from '../../services/mastery.service';

describe('MasteryService', () => {
  const service = new MasteryService();

  describe('calculateOverallScore', () => {
    it('should weight dimensions correctly: clarity 30%, reasoning 25%, simplification 25%, connection 20%', () => {
      const score = service.calculateOverallScore(80, 70, 60, 50);
      // 80*0.3 + 70*0.25 + 60*0.25 + 50*0.2 = 24 + 17.5 + 15 + 10 = 66.5
      expect(score).toBe(66.5);
    });

    it('should return 100 for perfect scores', () => {
      expect(service.calculateOverallScore(100, 100, 100, 100)).toBe(100);
    });

    it('should return 0 for zero scores', () => {
      expect(service.calculateOverallScore(0, 0, 0, 0)).toBe(0);
    });
  });

  describe('getDecision', () => {
    it('should return advance for score >= 85', () => {
      expect(service.getDecision(85)).toBe('advance');
      expect(service.getDecision(100)).toBe('advance');
    });

    it('should return loop_back for score 60-84', () => {
      expect(service.getDecision(60)).toBe('loop_back');
      expect(service.getDecision(84)).toBe('loop_back');
    });

    it('should return teach_more for score < 60', () => {
      expect(service.getDecision(59)).toBe('teach_more');
      expect(service.getDecision(0)).toBe('teach_more');
    });
  });

  describe('parseEvaluatorResponse', () => {
    it('should extract JSON scores from evaluator response', () => {
      const response = `Great work! Here are the results:
\`\`\`json
{
  "concept": "photosynthesis",
  "scores": { "clarity": 80, "reasoning": 70, "simplification": 60, "connection": 50 },
  "overall": 66.5,
  "decision": "loop_back",
  "feedback": "Good clarity but needs work on simplification",
  "gaps": ["simplification of light reactions"]
}
\`\`\`
You're making good progress!`;

      const result = service.parseEvaluatorResponse(response);
      expect(result).not.toBeNull();
      expect(result!.scores.clarity).toBe(80);
      expect(result!.decision).toBe('loop_back');
    });

    it('should return null for responses without JSON', () => {
      expect(service.parseEvaluatorResponse('No JSON here')).toBeNull();
    });
  });
});
