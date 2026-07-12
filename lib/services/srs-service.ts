export const SRS_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60];

import type { SentenceProgress } from "@/types/progress";
import { addDays, formatDateKey, isDue } from "@/lib/utils";
import { getConsecutiveCorrect, getRecallAccuracy } from "./recall-service";

export function getNextReviewDate(intervalIndex: number): string {
  const days = SRS_INTERVALS_DAYS[Math.min(intervalIndex, SRS_INTERVALS_DAYS.length - 1)];
  return formatDateKey(addDays(new Date(), days));
}

function getRetirementIntervalIndex(sp: SentenceProgress, rating: number): number {
  const consecutive = getConsecutiveCorrect(sp);
  const accuracy = getRecallAccuracy(sp);
  const hasRecallHistory = sp.recallHistory.length > 0;

  if (rating >= 5) {
    if (consecutive >= 5 && accuracy >= 0.9) return 3;
    if (consecutive >= 3 && accuracy >= 0.75) return 2;
    if (!hasRecallHistory) return 1;
    return 2;
  }

  if (consecutive >= 3 && accuracy >= 0.75) return 1;
  if (!hasRecallHistory) return 0;
  return 1;
}

function applySameDayGuard(
  sp: SentenceProgress,
  intervalIndex: number
): Pick<SentenceProgress, "srsIntervalIndex" | "srsNextReview"> {
  const today = formatDateKey();
  const maxIndex = SRS_INTERVALS_DAYS.length - 1;
  let index = Math.min(Math.max(intervalIndex, 0), maxIndex);
  let nextReview = getNextReviewDate(index);

  const lastRecall = sp.recallHistory[sp.recallHistory.length - 1];
  const lastRecallDay = lastRecall ? formatDateKey(new Date(lastRecall.date)) : null;

  while (
    index < maxIndex &&
    (nextReview <= today || (lastRecall?.correct && lastRecallDay && nextReview <= lastRecallDay))
  ) {
    index++;
    nextReview = getNextReviewDate(index);
  }

  return { srsIntervalIndex: index, srsNextReview: nextReview };
}

export function scheduleRetirementSrs(
  sp: SentenceProgress,
  rating: number
): Pick<SentenceProgress, "srsIntervalIndex" | "srsNextReview"> {
  const intervalIndex = getRetirementIntervalIndex(sp, rating);
  return applySameDayGuard(sp, intervalIndex);
}

export function needsImmediateRetirementRepair(sp: SentenceProgress): boolean {
  if (sp.batchStatus !== "retired" || !sp.retiredAt || !sp.srsNextReview) return false;
  return sp.srsNextReview <= sp.retiredAt;
}

export function repairImmediateRetirementSchedule(sp: SentenceProgress): SentenceProgress {
  if (!needsImmediateRetirementRepair(sp)) return sp;

  const rating = sp.rating ?? 4;
  const srs = scheduleRetirementSrs(sp, rating);
  return { ...sp, ...srs };
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
