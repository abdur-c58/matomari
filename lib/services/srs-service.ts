export const SRS_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60];

import type { SentenceProgress } from "@/types/progress";
import { addDays, formatDateKey, isDue } from "@/lib/utils";

export function getNextReviewDate(intervalIndex: number): string {
  const days = SRS_INTERVALS_DAYS[Math.min(intervalIndex, SRS_INTERVALS_DAYS.length - 1)];
  return formatDateKey(addDays(new Date(), days));
}

export function onCorrectRecall(sp: SentenceProgress): SentenceProgress {
  const nextIndex = Math.min(sp.srsIntervalIndex + 1, SRS_INTERVALS_DAYS.length - 1);
  return {
    ...sp,
    srsIntervalIndex: nextIndex,
    srsNextReview: getNextReviewDate(nextIndex),
  };
}

export function onIncorrectRecall(sp: SentenceProgress): SentenceProgress {
  return {
    ...sp,
    srsIntervalIndex: 0,
    srsNextReview: formatDateKey(addDays(new Date(), 1)),
  };
}

export function getDueReviewIds(
  sentences: Record<string, SentenceProgress>
): string[] {
  return Object.values(sentences)
    .filter((s) => s.batchStatus === "retired" && isDue(s.srsNextReview))
    .map((s) => s.sentenceId);
}

export function getDueRecallIds(
  sentences: Record<string, SentenceProgress>,
  activeIds: string[]
): string[] {
  const candidates = new Set([...activeIds, ...Object.keys(sentences)]);
  const due: string[] = [];

  for (const id of candidates) {
    const sp = sentences[id];
    if (!sp) {
      if (activeIds.includes(id)) due.push(id);
      continue;
    }
    const lastRecall = sp.recallHistory[sp.recallHistory.length - 1];
    if (!lastRecall) {
      if (sp.batchStatus === "active") due.push(id);
      continue;
    }
    const daysSince =
      (Date.now() - new Date(lastRecall.date).getTime()) / (1000 * 60 * 60 * 24);
    if (!lastRecall.correct && daysSince >= 1) due.push(id);
    else if (lastRecall.correct && daysSince >= 3 && (sp.rating ?? 5) < 4) due.push(id);
  }

  return due;
}
