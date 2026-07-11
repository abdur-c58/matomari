import type { RecallAttempt, SentenceProgress } from "@/types/progress";
import { formatDateKey } from "@/lib/utils";
import { onCorrectRecall, onIncorrectRecall } from "./srs-service";

export function recordRecallAttempt(
  sp: SentenceProgress,
  correct: boolean,
  hesitation = false
): SentenceProgress {
  const attempt: RecallAttempt = {
    date: new Date().toISOString(),
    correct,
    hesitation,
  };
  const recallHistory = [...sp.recallHistory, attempt];
  let updated: SentenceProgress = { ...sp, recallHistory };

  if (sp.batchStatus === "retired") {
    updated = correct ? onCorrectRecall(updated) : onIncorrectRecall(updated);
  }

  return updated;
}

export function getRecallAccuracy(sp: SentenceProgress, lastN = 10): number {
  const recent = sp.recallHistory.slice(-lastN);
  if (recent.length === 0) return 0;
  return recent.filter((a) => a.correct).length / recent.length;
}

export function getConsecutiveCorrect(sp: SentenceProgress): number {
  let count = 0;
  for (let i = sp.recallHistory.length - 1; i >= 0; i--) {
    if (sp.recallHistory[i].correct) count++;
    else break;
  }
  return count;
}

export function daysSinceFirstSeen(sp: SentenceProgress): number | null {
  if (!sp.firstSeenAt) return null;
  return Math.floor(
    (Date.now() - new Date(sp.firstSeenAt).getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function markMastered(sp: SentenceProgress): SentenceProgress {
  return {
    ...sp,
    rating: 5,
    masteredAt: formatDateKey(),
  };
}
