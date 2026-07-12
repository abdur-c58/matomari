"use client";

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Headphones,
  RefreshCw,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodayPlanType } from "@/types/today";

const modeConfig: Record<
  TodayPlanType,
  { icon: LucideIcon; bg: string; text: string; kanji: string }
> = {
  meaning_check: {
    icon: Eye,
    bg: "bg-mode-meaning/10",
    text: "text-mode-meaning",
    kanji: "意味",
  },
  listen_shadow: {
    icon: Headphones,
    bg: "bg-mode-listen/10",
    text: "text-mode-listen",
    kanji: "聴",
  },
  active_recall: {
    icon: RefreshCw,
    bg: "bg-mode-recall/10",
    text: "text-mode-recall",
    kanji: "思",
  },
  review: {
    icon: BookOpen,
    bg: "bg-mode-review/10",
    text: "text-mode-review",
    kanji: "復",
  },
};

export function ModeIcon({
  type,
  className,
}: {
  type: TodayPlanType;
  className?: string;
}) {
  const config = modeConfig[type] ?? modeConfig.meaning_check;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-2xl",
        config.bg,
        config.text,
        className
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
    </span>
  );
}

export const modeAccentBorder: Record<TodayPlanType, string> = {
  meaning_check: "border-l-mode-meaning",
  listen_shadow: "border-l-mode-listen",
  active_recall: "border-l-mode-recall",
  review: "border-l-mode-review",
};

export const modeBadgeStyles: Record<TodayPlanType, string> = {
  meaning_check: "bg-mode-meaning/10 text-mode-meaning",
  listen_shadow: "bg-mode-listen/10 text-mode-listen",
  active_recall: "bg-mode-recall/10 text-mode-recall",
  review: "bg-mode-review/10 text-mode-review",
};

export const modeKanji: Record<TodayPlanType, string> = {
  meaning_check: modeConfig.meaning_check.kanji,
  listen_shadow: modeConfig.listen_shadow.kanji,
  active_recall: modeConfig.active_recall.kanji,
  review: modeConfig.review.kanji,
};

export const modeAccentColor: Record<TodayPlanType, string> = {
  meaning_check: "var(--mode-meaning)",
  listen_shadow: "var(--mode-listen)",
  active_recall: "var(--mode-recall)",
  review: "var(--mode-review)",
};
