"use client";

import { Check, Circle } from "lucide-react";
import type { DailyStudyStatus } from "@/lib/services/daily-progress-service";
import { cn } from "@/lib/utils";

type TodayDailyStatusProps = {
  status: DailyStudyStatus;
  variant?: "hero" | "card";
  className?: string;
};

export function TodayDailyStatus({
  status,
  variant = "card",
  className,
}: TodayDailyStatusProps) {
  if (!status.hasBatch) return null;

  const isHero = variant === "hero";
  const doneCount = status.tasks.filter((t) => t.done).length;
  const totalCount = status.tasks.length;

  return (
    <div
      className={cn(
        isHero
          ? "mt-4 rounded-2xl border border-white/15 bg-black/20 p-3 backdrop-blur-sm"
          : "rounded-2xl border border-border bg-surface p-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-wider",
              isHero ? "text-white/70" : "text-muted"
            )}
          >
            Daily progress
          </p>
          <p
            className={cn(
              "mt-0.5 font-display text-sm font-semibold",
              isHero ? "text-white" : "text-foreground"
            )}
          >
            {status.isComplete
              ? "Today’s study is complete"
              : `${doneCount} of ${totalCount} done for today`}
          </p>
        </div>
        {status.streak > 0 && (
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
              isHero ? "bg-white/15 text-white" : "bg-foreground/10 text-foreground"
            )}
          >
            {status.streak} day{status.streak === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <ul className="mt-3 space-y-2">
        {status.tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-2.5 text-sm">
            {task.done ? (
              <Check
                className={cn(
                  "h-4 w-4 shrink-0",
                  isHero ? "text-emerald-300" : "text-mode-review"
                )}
                strokeWidth={2.5}
              />
            ) : (
              <Circle
                className={cn(
                  "h-4 w-4 shrink-0",
                  isHero ? "text-white/35" : "text-muted"
                )}
                strokeWidth={2}
              />
            )}
            <span className={cn(isHero ? "text-white/90" : "text-foreground")}>
              {task.label}
            </span>
            {!task.done && task.remaining > 0 && (
              <span
                className={cn(
                  "ml-auto tabular-nums text-xs",
                  isHero ? "text-white/55" : "text-muted"
                )}
              >
                {task.remaining} left
              </span>
            )}
          </li>
        ))}
      </ul>

      {(status.studiedToday || status.minutesToday > 0) && (
        <p
          className={cn(
            "mt-3 text-xs",
            isHero ? "text-white/55" : "text-muted"
          )}
        >
          {status.minutesToday > 0
            ? `${status.minutesToday} min studied today`
            : "You opened a study mode today"}
        </p>
      )}
    </div>
  );
}
