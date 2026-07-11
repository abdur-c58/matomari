export type TodayPlanType =
  | "meaning_check"
  | "listen_shadow"
  | "active_recall"
  | "review";

export interface TodayPlanItem {
  type: TodayPlanType;
  title: string;
  description: string;
  count: number;
  href: string;
  priority: number;
}
