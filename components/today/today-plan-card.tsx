"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { modeKanji } from "@/components/ui/mode-icon";
import type { TodayPlanItem } from "@/types/today";
import { cn } from "@/lib/utils";

type TodayPlanCardProps = {
  item: TodayPlanItem;
  primary?: boolean;
  className?: string;
};

export function TodayPlanCard({ item, primary = false, className }: TodayPlanCardProps) {
  const kanji = modeKanji[item.type] ?? modeKanji.meaning_check;

  return (
    <Link href={item.href} className={cn("group block h-full", className)}>
      <Card
        variant={primary ? "elevated" : "interactive"}
        className={cn(
          "today-plan-card h-full overflow-hidden border-border/70 p-0",
          `today-plan-card--${item.type}`,
          primary && "today-plan-card--primary"
        )}
      >
        <span className="today-plan-card-kanji font-brush" aria-hidden="true">
          {kanji}
        </span>

        <div className="today-plan-card-body">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[1.05rem] font-semibold leading-snug tracking-tight text-foreground">
                {item.title}
              </h2>
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
                <ArrowUpRight className="today-plan-card-arrow h-4 w-4 text-muted/70 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
              )}
            </div>
          </div>

          {primary && item.count > 0 && (
            <Button className="today-plan-card-cta mt-5 w-full sm:w-auto" size="sm">
              Start now
            </Button>
          )}
        </div>
      </Card>
    </Link>
  );
}
