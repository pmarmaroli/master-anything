import { SpacedRepetitionService } from '../../services/spaced-repetition.service';
import { SpacedRepetitionItem } from '../../types';

describe('SpacedRepetitionService', () => {
  const service = new SpacedRepetitionService();

  describe('createItem', () => {
    it('should create an item with 1-day initial interval', () => {
      const item = service.createItem('photosynthesis');
      expect(item.concept).toBe('photosynthesis');
      expect(item.interval).toBe(1);
      expect(item.easeFactor).toBe(2.5);
      expect(item.reviewCount).toBe(0);
    });
  });

  describe('processReview', () => {
    it('should increase interval on success', () => {
      const item: SpacedRepetitionItem = {
        concept: 'test',
        nextReviewAt: new Date(),
        interval: 1,
        easeFactor: 2.5,
        reviewCount: 0,
      };
      const updated = service.processReview(item, true);
      expect(updated.interval).toBe(2.5); // 1 * 2.5
      expect(updated.reviewCount).toBe(1);
    });

    it('should reset interval to 1 on failure for early reviews', () => {
      const item: SpacedRepetitionItem = {
        concept: 'test',
        nextReviewAt: new Date(),
        interval: 3,
        easeFactor: 2.5,
        reviewCount: 1,
      };
      const updated = service.processReview(item, false);
      expect(updated.interval).toBe(1);
    });

    it('should halve interval on failure for later reviews', () => {
      const item: SpacedRepetitionItem = {
        concept: 'test',
        nextReviewAt: new Date(),
        interval: 7,
        easeFactor: 2.5,
        reviewCount: 2,
      };
      const updated = service.processReview(item, false);
      expect(updated.interval).toBe(3.5); // 7 * 0.5
    });
  });

  describe('getDueItems', () => {
    it('should return items past their review date', () => {
      const items: SpacedRepetitionItem[] = [
        { concept: 'due', nextReviewAt: new Date('2020-01-01'), interval: 1, easeFactor: 2.5, reviewCount: 1 },
        { concept: 'not-due', nextReviewAt: new Date('2099-01-01'), interval: 1, easeFactor: 2.5, reviewCount: 1 },
      ];
      const due = service.getDueItems(items);
      expect(due).toHaveLength(1);
      expect(due[0].concept).toBe('due');
    });
  });
});
