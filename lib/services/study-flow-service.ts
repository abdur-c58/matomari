import type { Dataset } from "@/types/sentence";
import type { UserProgress } from "@/types/progress";
import { getActiveBatchIds, getActiveBatchSentences } from "./batch-service";
import { buildTodayPlan } from "./today-plan-service";
import { getDueRecallIds, getDueReviewIds } from "./srs-service";

export type StudyFlowStep =
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
  confirmComplete: boolean,
  dueRecall: number,
  dueReview: number
): StudyFlowStep {
  if (!confirmComplete) return "confirm_meanings";
  if (dueRecall > 0) return "active_recall";
  if (dueReview > 0) return "review";
  if (confirmComplete) return "shadow";
  return "complete";
}

export function getStudyFlowState(
  dataset: Dataset | null,
  progress: UserProgress
): StudyFlowState | null {
  if (!dataset || !progress.batchConfig) return null;

  const activeSentences = getActiveBatchSentences(dataset, progress);
  const activeIds = getActiveBatchIds(progress);
  const activeTotal = activeSentences.length;

  const unconfirmed = activeSentences.filter(
    (s) => !progress.sentences[s.id]?.meaningConfirmed
  );
  const confirmedCount = activeTotal - unconfirmed.length;
  const confirmComplete = unconfirmed.length === 0 && activeTotal > 0;

  const dueRecall = getDueRecallIds(progress.sentences, activeIds);
  const dueReview = getDueReviewIds(progress.sentences);

  const currentStep = resolveCurrentStep(
    confirmComplete,
    dueRecall.length,
    dueReview.length
  );

  const recallHref =
    dueRecall.length > 0
      ? `/recall?ids=${dueRecall.join(",")}`
      : "/recall";

  const reviewHref =
    dueReview.length > 0
      ? `/recall?ids=${dueReview.join(",")}&mode=review`
      : "/recall?mode=review";

  const steps: StudyFlowStepInfo[] = [
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
      done: confirmComplete ? activeTotal : 0,
      total: activeTotal,
      isComplete: false,
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
    },
  ];

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

  const plan = buildTodayPlan(dataset, progress);
  const nextItem = plan[0];
  const nextHref = nextItem?.href ?? "/listen";
  const nextLabel =
    nextItem?.type === "meaning_check"
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
  if (!dataset || !progress.batchConfig) return "/batch";

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
  if (!dataset || !progress.batchConfig) {
    return { href: "/", label: "Back to Today" };
  }

  const state = getStudyFlowState(dataset, progress);
  if (!state) return { href: "/", label: "Back to Today" };

  const recall = state.steps.find((s) => s.step === "active_recall");
  if (recall && recall.total > 0 && !recall.isComplete) {
    return { href: recall.href, label: STEP_META.active_recall.label };
  }

  const review = state.steps.find((s) => s.step === "review");
  if (review && review.total > 0) {
    return { href: review.href, label: STEP_META.review.label };
  }

  return { href: "/", label: "Back to Today" };
}
