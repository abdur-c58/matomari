export type TodayPlanType =
  | "return_review"
  | "meaning_check"
  | "listen_shadow"
  | "active_recall"
  | "review";

export type TodayPlanStepState = "locked" | "active" | "complete" | "available";

export interface TodayPlanItem {
  type: TodayPlanType;
  title: string;
  description: string;
  count: number;
  href: string;
  priority: number;
  state: TodayPlanStepState;
  lockedReason?: string;
}
