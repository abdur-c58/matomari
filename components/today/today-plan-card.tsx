"use client";

import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { modeKanji } from "@/components/ui/mode-icon";
import type { TodayPlanItem } from "@/types/today";
import { cn } from "@/lib/utils";

type TodayPlanCardProps = {
  item: TodayPlanItem;
  className?: string;
  onActivate?: (item: TodayPlanItem) => void;
};

export function TodayPlanCard({ item, className, onActivate }: TodayPlanCardProps) {
  const kanji = modeKanji[item.type] ?? modeKanji.meaning_check;
  const isLocked = item.state === "locked";
  const isActive = item.state === "active";
  const isComplete = item.state === "complete";
  const isClickable = !isLocked && Boolean(onActivate || item.href);

  const card = (
    <Card
      variant={isClickable && !isLocked ? "interactive" : "default"}
      className={cn(
        "today-plan-card h-full overflow-hidden border-border/70 p-0 transition-all duration-300",
        `today-plan-card--${item.type}`,
        isActive && "today-plan-card--primary",
        isLocked && "opacity-55 saturate-75",
        isComplete && "today-plan-card--complete",
        className
      )}
    >
      <span className="today-plan-card-kanji font-brush" aria-hidden="true">
        {kanji}
      </span>

      <div className="today-plan-card-body">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-[1.05rem] font-semibold leading-snug tracking-tight text-foreground">
                {item.title}
              </h2>
              {isComplete && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mode-meaning/20 text-mode-meaning">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </div>
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">
              {item.description}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
            {item.count > 0 ? (
              <>
                <span className="today-plan-card-count tabular-nums">{item.count}</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                  due
                </span>
              </>
            ) : (
              <ArrowUpRight
                className={cn(
                  "today-plan-card-arrow h-4 w-4 text-muted/70 transition-transform duration-200",
                  isClickable && !isLocked && "group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
                )}
              />
            )}
          </div>
        </div>

        {isActive && item.count > 0 && (
          <span
            className={cn(
              buttonVariants({ size: "sm" }),
              "today-plan-card-cta mt-5 w-full sm:w-auto pointer-events-none"
            )}
          >
            Start now
          </span>
        )}
      </div>
    </Card>
  );

  if (onActivate) {
    return (
      <button
        type="button"
        className={cn(
          "group block h-full w-full text-left",
          isLocked && "cursor-not-allowed"
        )}
        onClick={() => onActivate(item)}
      >
        {card}
      </button>
    );
  }

  if (isLocked || !item.href) {
    return <div className="h-full">{card}</div>;
  }

  return (
    <Link href={item.href} className="group block h-full">
      {card}
    </Link>
  );
}
