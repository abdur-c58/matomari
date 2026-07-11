import type { SentenceProgress } from "@/types/progress";
import { getConsecutiveCorrect, getRecallAccuracy } from "./recall-service";

export function suggestRating(sp: SentenceProgress): number | null {
  if (sp.recallHistory.length === 0) return null;

  const consecutive = getConsecutiveCorrect(sp);
  const accuracy = getRecallAccuracy(sp);

  if (consecutive >= 5 && accuracy >= 0.9) return 5;
  if (consecutive >= 3 && accuracy >= 0.75) return 4;
  if (accuracy >= 0.6) return 3;
  if (accuracy >= 0.4) return 2;
  return 1;
}

export function applyRating(
  sp: SentenceProgress,
  rating: number
): SentenceProgress {
  return {
    ...sp,
    rating,
    masteredAt: rating === 5 ? new Date().toISOString().slice(0, 10) : sp.masteredAt,
  };
}
