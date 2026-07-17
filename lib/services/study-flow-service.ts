import type { Dataset } from "@/types/sentence";
import type { UserProgress } from "@/types/progress";
import type { AppStats } from "@/types/stats";
import { getActiveBatchIds, getActiveBatchSentences } from "./batch-service";
import {
  getReturnReviewIds,
  withResolvedDailyBatch,
} from "./daily-focus-service";
import { hasShadowSessionToday } from "./daily-progress-service";
import { buildTodayPlan } from "./today-plan-service";
import { getDueRecallIds, getDueReviewIds } from "./srs-service";

export type StudyFlowStep =
  | "return_review"
  | "confirm_meanings"
  | "shadow"
  | "active_recall"
  | "review"
  | "complete";

export interface StudyFlowStepInfo {
  step: StudyFlowStep;
  title: string;
  instruction: string;
  href: string;
  done: number;
  total: number;
  isCurrent: boolean;
  isComplete: boolean;
}

export interface StudyFlowState {
  steps: StudyFlowStepInfo[];
  currentStep: StudyFlowStep;
  nextHref: string;
  nextLabel: string;
}

const STEP_META: Record<
  StudyFlowStep,
  { title: string; instruction: string; label: string }
> = {
  return_review: {
    title: "Quick review",
    instruction:
      "Before continuing, check you still remember sentences from this island.",
    label: "Start quick review",
  },
  confirm_meanings: {
    title: "Confirm meanings",
    instruction:
      "Read each sentence. Only continue once you understand the meaning.",
    label: "Confirm meanings",
  },
  shadow: {
    title: "Listen & shadow",
    instruction:
      "Play each sentence, pause, and repeat aloud. Match rhythm and intonation.",
    label: "Start shadowing",
  },
  active_recall: {
    title: "Active recall",
    instruction:
      "Produce Japanese from the English prompt before revealing the answer.",
    label: "Start recall",
  },
  review: {
    title: "Review retired",
    instruction: "Quick check-in on sentences you've already retired.",
    label: "Start review",
  },
  complete: {
    title: "All caught up",
    instruction:
      "Your batch is up to date. Shadow or recall anytime to keep skills sharp.",
    label: "Keep practicing",
  },
};

function resolveCurrentStep(
  returnReview: number,
  confirmComplete: boolean,
  shadowedToday: boolean,
  dueRecall: number,
  dueReview: number
): StudyFlowStep {
  if (returnReview > 0) return "return_review";
  if (!confirmComplete) return "confirm_meanings";
  if (!shadowedToday) return "shadow";
  if (dueRecall > 0) return "active_recall";
  if (dueReview > 0) return "review";
  return "complete";
}

export function getStudyFlowState(
  dataset: Dataset | null,
  progress: UserProgress,
  stats?: AppStats | null
): StudyFlowState | null {
  const effective = withResolvedDailyBatch(dataset, progress);
  if (!dataset || !effective?.batchConfig) return null;

  const config = effective.batchConfig;
  const activeSentences = getActiveBatchSentences(dataset, effective, config);
  const activeIds = getActiveBatchIds(effective, config);
  const activeTotal = activeSentences.length;

  const returnReview = getReturnReviewIds(effective);
  const unconfirmed = activeSentences.filter(
    (s) => !effective.sentences[s.id]?.meaningConfirmed
  );
  const confirmedCount = activeTotal - unconfirmed.length;
  const confirmComplete = unconfirmed.length === 0 && activeTotal > 0;
  const shadowedToday = stats ? hasShadowSessionToday(stats) : false;

  const dueRecall = getDueRecallIds(effective.sentences, activeIds);
  const dueReview = getDueReviewIds(effective.sentences);

  const currentStep = resolveCurrentStep(
    returnReview.length,
    confirmComplete,
    shadowedToday,
    dueRecall.length,
    dueReview.length
  );

  const returnReviewHref =
    returnReview.length > 0
      ? `/recall?ids=${returnReview.join(",")}&mode=return`
      : "/recall";

  const recallHref =
    dueRecall.length > 0
      ? `/recall?ids=${dueRecall.join(",")}`
      : "/recall";

  const reviewHref =
    dueReview.length > 0
      ? `/recall?ids=${dueReview.join(",")}&mode=review`
      : "/recall?mode=review";

  const steps: StudyFlowStepInfo[] = [];

  if (returnReview.length > 0) {
    steps.push({
      step: "return_review",
      title: STEP_META.return_review.title,
      instruction: STEP_META.return_review.instruction,
      href: returnReviewHref,
      done: 0,
      total: returnReview.length,
      isComplete: false,
      isCurrent: currentStep === "return_review",
    });
  }

  steps.push(
    {
      step: "confirm_meanings",
      title: STEP_META.confirm_meanings.title,
      instruction: STEP_META.confirm_meanings.instruction,
      href: "/listen?step=meaning",
      done: confirmedCount,
      total: activeTotal,
      isComplete: confirmComplete,
      isCurrent: currentStep === "confirm_meanings",
    },
    {
      step: "shadow",
      title: STEP_META.shadow.title,
      instruction: STEP_META.shadow.instruction,
      href: "/listen?step=shadow",
      done: confirmComplete && shadowedToday ? activeTotal : 0,
      total: activeTotal,
      isComplete: confirmComplete && shadowedToday,
      isCurrent: currentStep === "shadow",
    },
    {
      step: "active_recall",
      title: STEP_META.active_recall.title,
      instruction: STEP_META.active_recall.instruction,
      href: recallHref,
      done: dueRecall.length === 0 && confirmComplete ? 1 : 0,
      total: Math.max(dueRecall.length, confirmComplete ? 1 : 0),
      isComplete: dueRecall.length === 0 && confirmComplete,
      isCurrent: currentStep === "active_recall",
    }
  );

  if (dueReview.length > 0) {
    steps.push({
      step: "review",
      title: STEP_META.review.title,
      instruction: STEP_META.review.instruction,
      href: reviewHref,
      done: 0,
      total: dueReview.length,
      isComplete: false,
      isCurrent: currentStep === "review",
    });
  }

  const plan = buildTodayPlan(dataset, progress, stats);
  const nextItem = plan[0];
  const nextHref = nextItem?.href ?? "/listen";
  const nextLabel =
    nextItem?.type === "return_review"
      ? STEP_META.return_review.label
      : nextItem?.type === "meaning_check"
        ? STEP_META.confirm_meanings.label
        : nextItem?.type === "listen_shadow"
          ? STEP_META.shadow.label
          : nextItem?.type === "active_recall"
            ? STEP_META.active_recall.label
            : nextItem?.type === "review"
              ? STEP_META.review.label
              : STEP_META.complete.label;

  return {
    steps,
    currentStep,
    nextHref,
    nextLabel,
  };
}

export function getNextStudyHref(
  dataset: Dataset | null,
  progress: UserProgress,
  options?: { welcome?: boolean }
): string {
  const effective = withResolvedDailyBatch(dataset, progress);
  if (!dataset || !effective?.batchConfig) return "/batch";

  const state = getStudyFlowState(dataset, progress);
  if (!state) return "/batch";

  let href = state.nextHref;
  if (options?.welcome && href.includes("step=meaning")) {
    href += href.includes("?") ? "&welcome=1" : "?welcome=1";
  }
  return href;
}

export function getNextStepAfterShadow(
  dataset: Dataset | null,
  progress: UserProgress
): { href: string; label: string } {
  const effective = withResolvedDailyBatch(dataset, progress);
  if (!dataset || !effective?.batchConfig) {
    return { href: "/today", label: "Back to Dashboard" };
  }

  const state = getStudyFlowState(dataset, progress);
  if (!state) return { href: "/today", label: "Back to Dashboard" };

  const recall = state.steps.find((s) => s.step === "active_recall");
  if (recall && recall.total > 0 && !recall.isComplete) {
    return { href: recall.href, label: STEP_META.active_recall.label };
  }

  const review = state.steps.find((s) => s.step === "review");
  if (review && review.total > 0) {
    return { href: review.href, label: STEP_META.review.label };
  }

  return { href: "/today", label: "Back to Dashboard" };
}
