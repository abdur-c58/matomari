import type { Dataset } from "@/types/sentence";
import type { UserProgress } from "@/types/progress";
import type { AppStats } from "@/types/stats";
import type { TodayPlanItem, TodayPlanStepState } from "@/types/today";
import { getActiveBatchIds, getActiveBatchSentences } from "./batch-service";
import {
  getReturnReviewIds,
  withResolvedDailyBatch,
} from "./daily-focus-service";
import {
  hasShadowSessionToday,
  type DailyStudyTaskId,
} from "./daily-progress-service";
import { getDueRecallIds, getDueReviewIds } from "./srs-service";
import { formatDateKey } from "@/lib/utils";

export interface TodayPlanContext {
  returnReview: string[];
  unconfirmedCount: number;
  meaningsComplete: boolean;
  shadowComplete: boolean;
  recallComplete: boolean;
  dueRecallCount: number;
  dueReviewCount: number;
  activeSentenceCount: number;
}

export function getTodayPlanContext(
  dataset: Dataset | null,
  progress: UserProgress,
  stats?: AppStats | null
): TodayPlanContext | null {
  if (!dataset) return null;

  const effective = withResolvedDailyBatch(dataset, progress);
  if (!effective?.batchConfig) return null;

  const config = effective.batchConfig;
  const activeIds = getActiveBatchIds(effective, config);
  const activeSentences = getActiveBatchSentences(dataset, effective, config);
  const unconfirmed = activeSentences.filter(
    (s) => !effective.sentences[s.id]?.meaningConfirmed
  );

  const date = formatDateKey();
  const todaySnapshot = stats?.dailySnapshots.find((s) => s.date === date);
  const completedToday = new Set<DailyStudyTaskId>(
    (todaySnapshot?.completedTasks ?? []) as DailyStudyTaskId[]
  );

  const returnReview = getReturnReviewIds(effective);
  const shadowedToday = stats ? hasShadowSessionToday(stats) : false;
  const dueRecall = getDueRecallIds(effective.sentences, activeIds);
  const dueReview = getDueReviewIds(effective.sentences);

  const meaningsComplete =
    completedToday.has("meanings") ||
    (unconfirmed.length === 0 && activeSentences.length > 0);

  const shadowComplete =
    completedToday.has("shadow") ||
    shadowedToday ||
    (meaningsComplete && activeSentences.length === 0);

  const recallComplete =
    completedToday.has("recall") || dueRecall.length === 0;

  return {
    returnReview,
    unconfirmedCount: unconfirmed.length,
    meaningsComplete,
    shadowComplete,
    recallComplete,
    dueRecallCount: dueRecall.length,
    dueReviewCount: dueReview.length,
    activeSentenceCount: activeSentences.length,
  };
}

function applyChainStates(
  steps: TodayPlanItem[],
  returnReviewPending: boolean
): TodayPlanItem[] {
  const chain = steps.filter((s) => s.type !== "review");
  const firstIncomplete = chain.find((s) => s.state !== "complete");

  return steps.map((step) => {
    if (step.type === "review") {
      return { ...step, state: "available" as TodayPlanStepState };
    }

    if (returnReviewPending) {
      return {
        ...step,
        state: "locked" as TodayPlanStepState,
        lockedReason: "Finish the quick review first",
      };
    }

    if (step.state === "complete") return step;

    const chainIndex = chain.findIndex((s) => s.type === step.type);
    const activeIndex = firstIncomplete
      ? chain.findIndex((s) => s.type === firstIncomplete.type)
      : -1;

    if (firstIncomplete && step.type === firstIncomplete.type) {
      return { ...step, state: "active" };
    }

    if (activeIndex >= 0 && chainIndex > activeIndex) {
      const prev = chain[activeIndex];
      return {
        ...step,
        state: "locked",
        lockedReason: `Finish ${prev.title.toLowerCase()} first`,
      };
    }

    return step;
  });
}

export function buildReturnReviewItem(
  dataset: Dataset | null,
  progress: UserProgress
): TodayPlanItem | null {
  if (!dataset) return null;
  const ctx = getTodayPlanContext(dataset, progress);
  if (!ctx || ctx.returnReview.length === 0) return null;

  return {
    type: "return_review",
    title: "Quick review",
    description: "Check you still remember sentences from this scene",
    count: ctx.returnReview.length,
    href: `/recall?ids=${ctx.returnReview.join(",")}&mode=return`,
    priority: 0,
    state: "active",
  };
}

export function buildTodayPlan(
  dataset: Dataset | null,
  progress: UserProgress,
  stats?: AppStats | null
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
        state: "active",
      },
    ];
  }

  const ctx = getTodayPlanContext(dataset, progress, stats);
  if (!ctx) {
    return [
      {
        type: "meaning_check",
        title: "Confirm meanings",
        description: "Understand each sentence before listening",
        count: 0,
        href: "/listen?step=meaning",
        priority: 1,
        state: "locked",
      },
      {
        type: "listen_shadow",
        title: "Listen & shadow",
        description: "Passive listening at native speed",
        count: 0,
        href: "/listen?step=shadow",
        priority: 2,
        state: "locked",
      },
      {
        type: "active_recall",
        title: "Active recall",
        description: "Produce Japanese from English prompts",
        count: 0,
        href: "/recall",
        priority: 3,
        state: "locked",
      },
      {
        type: "review",
        title: "Review retired sentences",
        description: "Spaced repetition check-in",
        count: 0,
        href: "/recall?mode=review",
        priority: 4,
        state: "available",
      },
    ];
  }

  const effective = withResolvedDailyBatch(dataset, progress)!;
  const activeIds = getActiveBatchIds(effective, effective.batchConfig!);
  const dueRecallIds = getDueRecallIds(effective.sentences, activeIds);
  const dueReviewIds = getDueReviewIds(effective.sentences);

  const dueRecallHref =
    dueRecallIds.length > 0
      ? `/recall?ids=${dueRecallIds.join(",")}`
      : "/recall";

  const dueReviewHref =
    dueReviewIds.length > 0
      ? `/recall?ids=${dueReviewIds.join(",")}&mode=review`
      : "/recall?mode=review";

  const steps: TodayPlanItem[] = [
    {
      type: "meaning_check",
      title: "Confirm meanings",
      description: "Understand each sentence before listening",
      count: ctx.unconfirmedCount,
      href: "/listen?step=meaning",
      priority: 1,
      state: ctx.meaningsComplete ? "complete" : "locked",
    },
    {
      type: "listen_shadow",
      title: "Listen & shadow",
      description: "Passive listening at native speed",
      count: ctx.activeSentenceCount,
      href: "/listen?step=shadow",
      priority: 2,
      state: ctx.shadowComplete ? "complete" : "locked",
    },
    {
      type: "active_recall",
      title: "Active recall",
      description: "Produce Japanese from English prompts",
      count: ctx.dueRecallCount,
      href: dueRecallHref,
      priority: 3,
      state: ctx.recallComplete ? "complete" : "locked",
    },
    {
      type: "review",
      title: "Review retired sentences",
      description: "Spaced repetition check-in",
      count: ctx.dueReviewCount,
      href: dueReviewHref,
      priority: 4,
      state: "available",
    },
  ];

  return applyChainStates(steps, ctx.returnReview.length > 0);
}

export type GatedTodayPlanStep = Exclude<TodayPlanItem["type"], "review" | "return_review">;

export function getTodayPlanStepAccess(
  stepType: GatedTodayPlanStep,
  dataset: Dataset | null,
  progress: UserProgress,
  stats?: AppStats | null
): {
  allowed: boolean;
  lockedReason?: string;
  continueHref?: string;
} {
  const returnReview = buildReturnReviewItem(dataset, progress);
  if (returnReview) {
    return {
      allowed: false,
      lockedReason: "Finish the quick review first",
      continueHref: returnReview.href,
    };
  }

  const plan = buildTodayPlan(dataset, progress, stats);
  const item = plan.find((step) => step.type === stepType);
  if (!item || item.state !== "locked") {
    return { allowed: true };
  }

  const activeStep = plan.find((step) => step.state === "active");
  return {
    allowed: false,
    lockedReason: item.lockedReason ?? "Finish the previous steps first.",
    continueHref: activeStep?.href ?? "/today",
  };
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
