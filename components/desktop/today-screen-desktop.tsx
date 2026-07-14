"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/components/providers/app-provider";
import { getDailyStudyStatus } from "@/lib/services/daily-progress-service";
import { useSyncTodayCompletion } from "@/hooks/use-sync-today-completion";
import { useAutoResumeDailyFocus } from "@/hooks/use-auto-resume-daily-focus";
import { resolveDailyBatchConfig } from "@/lib/services/daily-focus-service";
import {
  getStudyFocusLabel,
  getStudyFocusProgress,
} from "@/lib/services/study-focus-service";
import { StudyFocusBanner } from "@/components/batch/study-focus-banner";
import { StudyFlowGuide } from "@/components/study/study-flow-guide";
import { AppGate } from "@/components/layout/empty-state";
import { DesktopPageShell } from "@/components/layout/desktop-page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AskButton } from "@/components/ai/ask-button";
import { TodayHero } from "@/components/today/today-hero";
import { TodayPlanGrid } from "@/components/today/today-plan-grid";
import { CasualListenProgress } from "@/components/study/casual-listen-progress";

export function TodayScreenDesktop() {
  const { dataset, progress, stats, loading, syncStatus } = useApp();
  useSyncTodayCompletion();
  useAutoResumeDailyFocus();

  const studyFocus = useMemo(
    () => (dataset ? getStudyFocusLabel(dataset, progress) : null),
    [dataset, progress]
  );

  const focusProgress = useMemo(
    () =>
      dataset
        ? getStudyFocusProgress(dataset, progress)
        : { activeCount: 0, confirmedCount: 0 },
    [dataset, progress]
  );

  const hasDailyFocus = useMemo(
    () => Boolean(dataset && resolveDailyBatchConfig(dataset, progress)),
    [dataset, progress]
  );

  const dailyStatus = useMemo(
    () => getDailyStudyStatus(dataset, progress, stats),
    [dataset, progress, stats]
  );

  if (loading) {
    return (
      <DesktopPageShell>
        <Skeleton className="mb-4 h-8 w-32" />
        <Skeleton className="mb-6 h-12 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </DesktopPageShell>
    );
  }

  return (
    <AppGate>
      <DesktopPageShell className="max-w-none px-0 pt-0">
        <TodayHero
          dailyStatus={dailyStatus}
          syncStatus={syncStatus}
          variant="desktop"
        />

        <div className="mx-auto w-full max-w-[1400px] space-y-6 px-8 pb-6 pt-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              {dailyStatus.hasBatch && <CasualListenProgress />}

              {hasDailyFocus && <StudyFlowGuide />}

              <TodayPlanGrid
                layout="grid"
                cardClassName="desktop-hover-lift h-full"
              />

              {hasDailyFocus && (
                <div className="flex gap-3">
                  <Button variant="secondary" asChild>
                    <Link href="/prepare">Pre-study</Link>
                  </Button>
                  <Button variant="secondary" asChild>
                    <Link href="/weak">Weak sentences</Link>
                  </Button>
                </div>
              )}
            </div>

            <aside className="space-y-4">
              {studyFocus && (
                <StudyFocusBanner focus={studyFocus} progress={focusProgress} />
              )}
              <Card className="p-4">
                <p className="text-sm font-medium text-foreground">Need help?</p>
                <p className="mt-1 text-sm text-muted">
                  Ask the AI tutor or read the method guide.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AskButton
                    context={{ type: "general" }}
                    label="Ask tutor"
                    variant="secondary"
                    size="sm"
                  />
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/guide">Method guide</Link>
                  </Button>
                </div>
              </Card>
            </aside>
          </div>
        </div>
      </DesktopPageShell>
    </AppGate>
  );
}
