"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useApp } from "@/components/providers/app-provider";
import { getDailyStudyStatus } from "@/lib/services/daily-progress-service";
import { useSyncTodayCompletion } from "@/hooks/use-sync-today-completion";
import { useAutoResumeDailyFocus } from "@/hooks/use-auto-resume-daily-focus";
import { resolveDailyBatchConfig } from "@/lib/services/daily-focus-service";
import {
  getStudyFocusLabel,
  getStudyFocusProgress,
} from "@/lib/services/study-focus-service";
import {
  StudyFocusBanner,
} from "@/components/batch/study-focus-banner";
import { StudyFlowGuide } from "@/components/study/study-flow-guide";
import { AppGate } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AskButton } from "@/components/ai/ask-button";
import { TodayHero } from "@/components/today/today-hero";
import { TodayPlanGrid } from "@/components/today/today-plan-grid";
import { CasualListenProgress } from "@/components/study/casual-listen-progress";

export function TodayScreenMobile() {
  const { dataset, progress, stats, loading, syncStatus } = useApp();
  useSyncTodayCompletion();
  useAutoResumeDailyFocus();

  const studyFocus = useMemo(
    () => (dataset ? getStudyFocusLabel(dataset, progress) : null),
    [dataset, progress]
  );

  const focusProgress = useMemo(
    () => (dataset ? getStudyFocusProgress(dataset, progress) : { activeCount: 0, confirmedCount: 0 }),
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
      <PageShell>
        <Skeleton className="mb-4 h-8 w-32" />
        <Skeleton className="mb-6 h-12 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <AppGate>
      <PageShell className="pt-0">
        <TodayHero
          dailyStatus={dailyStatus}
          syncStatus={syncStatus}
          variant="mobile"
        />

        {dailyStatus.hasBatch && (
          <CasualListenProgress className="mb-6" />
        )}

        {hasDailyFocus && (
          <StudyFlowGuide className="mb-6" />
        )}

        {studyFocus && (
          <StudyFocusBanner
            focus={studyFocus}
            progress={focusProgress}
          />
        )}

        <TodayPlanGrid className="mb-6" />

        {hasDailyFocus && (
          <div className="mt-6 flex gap-3">
            <Button variant="secondary" className="flex-1" asChild>
              <Link href="/prepare">Pre-study</Link>
            </Button>
            <Button variant="secondary" className="flex-1" asChild>
              <Link href="/weak">Weak sentences</Link>
            </Button>
          </div>
        )}

        <div className="mt-4 flex flex-col items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/guide">How this works</Link>
          </Button>
          <AskButton context={{ type: "general" }} label="Ask tutor" variant="ghost" size="sm" />
        </div>
      </PageShell>
    </AppGate>
  );
}
