import type { Dataset } from "@/types/sentence";
import type { UserProgress } from "@/types/progress";
import type { TodayPlanItem } from "@/types/today";
import { getActiveBatchIds, getActiveBatchSentences } from "./batch-service";
import { getDueRecallIds, getDueReviewIds } from "./srs-service";

export function buildTodayPlan(
  dataset: Dataset | null,
  progress: UserProgress
): TodayPlanItem[] {
  if (!dataset) {
    return [
      {
        type: "meaning_check",
        title: "Import your dataset",
        description: "Load your sentence library to get started",
        count: 0,
        href: "/import",
        priority: 0,
      },
    ];
  }

  if (!progress.batchConfig) {
    return [];
  }

  const activeIds = getActiveBatchIds(progress);
  const activeSentences = getActiveBatchSentences(dataset, progress);
  const unconfirmed = activeSentences.filter((s) => {
    const sp = progress.sentences[s.id];
    return !sp?.meaningConfirmed;
  });

  const dueRecall = getDueRecallIds(progress.sentences, activeIds);
  const dueReview = getDueReviewIds(progress.sentences);

  const items: TodayPlanItem[] = [];

  if (unconfirmed.length > 0) {
    items.push({
      type: "meaning_check",
      title: "Confirm meanings",
      description: "Understand each sentence before listening",
      count: unconfirmed.length,
      href: "/listen?step=meaning",
      priority: 1,
    });
  }

  if (activeSentences.length > 0 && unconfirmed.length === 0) {
    items.push({
      type: "listen_shadow",
      title: "Listen & shadow",
      description: "Passive listening at native speed",
      count: activeSentences.length,
      href: "/listen?step=shadow",
      priority: 2,
    });
  }

  if (dueRecall.length > 0) {
    items.push({
      type: "active_recall",
      title: "Active recall",
      description: "Produce Japanese from English prompts",
      count: dueRecall.length,
      href: `/recall?ids=${dueRecall.join(",")}`,
      priority: 3,
    });
  }

  if (dueReview.length > 0) {
    items.push({
      type: "review",
      title: "Review retired sentences",
      description: "Spaced repetition check-in",
      count: dueReview.length,
      href: `/recall?ids=${dueReview.join(",")}&mode=review`,
      priority: 4,
    });
  }

  if (items.length === 0) {
    items.push({
      type: "listen_shadow",
      title: "Keep practicing",
      description: "Your batch is up to date — shadow or recall anytime",
      count: activeSentences.length,
      href: "/listen",
      priority: 5,
    });
  }

  return items.sort((a, b) => a.priority - b.priority);
}

export function getWeakSentenceIds(progress: UserProgress): string[] {
  return Object.values(progress.sentences)
    .filter((s) => s.rating !== null && s.rating <= 2)
    .sort((a, b) => {
      const ratingDiff = (a.rating ?? 0) - (b.rating ?? 0);
      if (ratingDiff !== 0) return ratingDiff;
      const aLast = a.recallHistory[a.recallHistory.length - 1];
      const bLast = b.recallHistory[b.recallHistory.length - 1];
      if (!aLast?.correct && bLast?.correct) return -1;
      if (aLast?.correct && !bLast?.correct) return 1;
      return 0;
    })
    .map((s) => s.sentenceId);
}
