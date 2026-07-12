"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import type { SyncStatus } from "@/components/ui/sync-indicator";
import { SyncIndicator } from "@/components/ui/sync-indicator";
import { Button } from "@/components/ui/button";
import { TodayDailyStatus } from "@/components/today/today-daily-status";
import type { DailyStudyStatus } from "@/lib/services/daily-progress-service";
import { cn } from "@/lib/utils";

type TodayHeroProps = {
  dailyStatus: DailyStudyStatus;
  syncStatus: SyncStatus;
  variant: "mobile" | "desktop";
};

export function TodayHero({ dailyStatus, syncStatus, variant }: TodayHeroProps) {
  const isMobile = variant === "mobile";
  const subtitle = dailyStatus.isComplete
    ? "You cleared today’s queue — nice work."
    : "Your study plan for today.";

  return (
    <div
      className={cn(
        "today-hero",
        isMobile ? "-mx-4 mb-2 px-4 pb-14 pt-4" : "today-hero--desktop pb-[4.5rem] pt-8"
      )}
    >
      <div className={cn(!isMobile && "mx-auto w-full max-w-[1400px] px-8")}>
        <div
          className={cn(
            "flex items-start justify-between gap-3",
            !isMobile && "flex-wrap gap-4"
          )}
        >
          <div className={cn(!isMobile && "min-w-0 flex-1")}>
            <div className="mb-2 flex items-center gap-2">
              <p className="today-hero-eyebrow text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Today
              </p>
              {isMobile && (
                <SyncIndicator status={syncStatus} className="today-hero-sync" />
              )}
            </div>

            <div
              className={cn(
                "today-hero-headline",
                isMobile ? "today-hero-headline--mobile" : "today-hero-headline--desktop"
              )}
            >
              <h1 className="today-hero-kanji font-brush" aria-label="Today">
                今日
              </h1>
              <p className={cn("today-hero-subtitle", !isMobile && "max-w-xl")}>
                {subtitle}
              </p>
            </div>
          </div>

          {isMobile ? (
            <Button variant="ghost" size="icon" className="today-hero-icon-btn" asChild>
              <Link href="/settings">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
          ) : (
            <SyncIndicator status={syncStatus} className="today-hero-sync shrink-0" />
          )}
        </div>

        {dailyStatus.hasBatch && (
          <TodayDailyStatus
            status={dailyStatus}
            variant="hero"
            className={isMobile ? undefined : "mt-5 max-w-lg"}
          />
        )}
      </div>
    </div>
  );
}
