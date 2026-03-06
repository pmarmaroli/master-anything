import { SpacedRepetitionItem } from '../types';

export class SpacedRepetitionService {
  createItem(concept: string): SpacedRepetitionItem {
    const now = new Date();
    const nextReview = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day

    return {
      concept,
      nextReviewAt: nextReview,
      interval: 1,
      easeFactor: 2.5,
      reviewCount: 0,
    };
  }

  processReview(item: SpacedRepetitionItem, success: boolean): SpacedRepetitionItem {
    let newInterval: number;
    let newEaseFactor = item.easeFactor;

    if (success) {
      newInterval = item.interval * item.easeFactor;
      // Slightly increase ease factor on success (capped at 3.0)
      newEaseFactor = Math.min(3.0, item.easeFactor + 0.1);
    } else {
      if (item.reviewCount < 2) {
        // Early reviews: reset to 1 day
        newInterval = 1;
      } else {
        // Later reviews: halve the interval
        newInterval = item.interval * 0.5;
      }
      // Decrease ease factor on failure (floor at 1.3)
      newEaseFactor = Math.max(1.3, item.easeFactor - 0.2);
    }

    const now = new Date();
    const nextReviewAt = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

    return {
      ...item,
      interval: newInterval,
      easeFactor: newEaseFactor,
      nextReviewAt,
      reviewCount: item.reviewCount + 1,
    };
  }

  getDueItems(items: SpacedRepetitionItem[]): SpacedRepetitionItem[] {
    const now = new Date();
    return items.filter((item) => item.nextReviewAt <= now);
  }
}
