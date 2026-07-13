import type { CSSProperties } from "react";
import type { TooltipProps } from "recharts";

export const STUDY_MODE_LABELS: Record<string, string> = {
  listen: "Listen",
  shadow: "Shadow",
  recall: "Recall",
  review: "Review",
  meaning_check: "Meanings",
  library: "Library",
  weak: "Weak practice",
};

export function formatStudyModeLabel(mode: string): string {
  return STUDY_MODE_LABELS[mode] ?? mode.replace(/_/g, " ");
}

export const chartTooltipContentStyle: CSSProperties = {
  backgroundColor: "var(--surface-raised)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--foreground)",
  boxShadow: "none",
};

export const chartTooltipLabelStyle: CSSProperties = {
  color: "var(--foreground)",
};

export const chartTooltipItemStyle: CSSProperties = {
  color: "var(--muted)",
};

/** Subtle bar hover band — avoids Recharts' default light-gray cursor in dark mode. */
export const barChartTooltipCursor = {
  fill: "color-mix(in srgb, var(--foreground) 8%, transparent)",
};

export const lineChartTooltipCursor = {
  stroke: "color-mix(in srgb, var(--foreground) 20%, transparent)",
};

export function chartTooltipProps(
  variant: "bar" | "line" = "bar"
): Pick<TooltipProps<number, string>, "contentStyle" | "labelStyle" | "itemStyle" | "cursor"> {
  return {
    contentStyle: chartTooltipContentStyle,
    labelStyle: chartTooltipLabelStyle,
    itemStyle: chartTooltipItemStyle,
    cursor: variant === "bar" ? barChartTooltipCursor : lineChartTooltipCursor,
  };
}
