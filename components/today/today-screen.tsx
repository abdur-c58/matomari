"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Settings } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { buildTodayPlan } from "@/lib/services/today-plan-service";
import {
  getStudyFocusLabel,
  getStudyFocusProgress,
  getSuggestedPathwayBatch,
  getPathwayBatchStats,
  getIslandSummaries,
} from "@/lib/services/study-focus-service";
import {
  StudyFocusBanner,
  ChooseStudyFocus,
} from "@/components/batch/study-focus-banner";
import { AppGate } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModeIcon, modeAccentBorder, modeBadgeStyles } from "@/components/ui/mode-icon";
import { SyncIndicator } from "@/components/ui/sync-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { AskButton } from "@/components/ai/ask-button";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function TodayScreen() {
  const { dataset, progress, loading, syncStatus } = useApp();

  const plan = useMemo(
    () => buildTodayPlan(dataset, progress),
    [dataset, progress]
  );

  const studyFocus = useMemo(
    () => (dataset ? getStudyFocusLabel(dataset, progress) : null),
    [dataset, progress]
  );

  const focusProgress = useMemo(
    () => (dataset ? getStudyFocusProgress(dataset, progress) : { activeCount: 0, confirmedCount: 0 }),
    [dataset, progress]
  );

  const chooseFocusMeta = useMemo(() => {
    if (!dataset || progress.batchConfig) return null;
    const suggested = getSuggestedPathwayBatch(dataset, progress);
    const batchStats = getPathwayBatchStats(dataset, progress);
    const batch = batchStats.find((b) => b.batchNumber === suggested);
    const islands = getIslandSummaries(dataset, progress);
    return {
      suggestedBatchNumber: suggested,
      suggestedBatchTitle: batch?.title ?? `Batch ${suggested}`,
      islandCount: islands.length,
    };
  }, [dataset, progress]);

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
      <PageShell>
        <div className="gradient-surface -mx-4 mb-6 rounded-b-3xl px-4 pb-6 pt-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <p className="text-sm font-medium text-muted">今日</p>
                <SyncIndicator status={syncStatus} />
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
                Today
              </h1>
              <p className="mt-1 text-sm text-muted">
                Your personalized study plan for right now.
              </p>
            </div>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/settings">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>

        {studyFocus && (
          <StudyFocusBanner
            focus={studyFocus}
            progress={focusProgress}
          />
        )}

        {chooseFocusMeta && (
          <ChooseStudyFocus
            suggestedBatchTitle={chooseFocusMeta.suggestedBatchTitle}
            suggestedBatchNumber={chooseFocusMeta.suggestedBatchNumber}
            islandCount={chooseFocusMeta.islandCount}
          />
        )}

        {plan.length > 0 && (
          <motion.div
            className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {plan.map((item, i) => (
              <motion.div key={item.type} variants={fadeUp}>
                <Link href={item.href}>
                  <Card
                    variant={i === 0 ? "elevated" : "interactive"}
                    className={cn(
                      "border-l-4 p-4 desktop-hover-lift",
                      modeAccentBorder[item.type] ?? "border-l-foreground"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <ModeIcon type={item.type} />
                      <div className="min-w-0 flex-1">
                        <h2 className="font-display font-semibold text-foreground">
                          {item.title}
                        </h2>
                        <p className="truncate text-sm text-muted">{item.description}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {item.count > 0 && (
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-sm font-semibold",
                              modeBadgeStyles[item.type]
                            )}
                          >
                            {item.count}
                          </span>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted" />
                      </div>
                    </div>
                    {i === 0 && item.count > 0 && (
                      <Button className="mt-4 w-full" size="sm">
                        Start now
                      </Button>
                    )}
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}

        {progress.batchConfig && (
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
