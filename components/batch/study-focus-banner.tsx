"use client";

import Link from "next/link";
import { Compass, Map, ChevronRight } from "lucide-react";
import type { StudyFocus, StudyFocusProgress } from "@/lib/services/study-focus-service";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StudyFocusBanner({
  focus,
  progress: focusProgress,
  changeHref = "/batch",
  compact = false,
}: {
  focus: StudyFocus;
  progress: StudyFocusProgress;
  changeHref?: string;
  compact?: boolean;
}) {
  const pct =
    focusProgress.activeCount > 0
      ? Math.round((focusProgress.confirmedCount / focusProgress.activeCount) * 100)
      : 0;

  return (
    <Card className={cn("p-4", compact ? "mb-4" : "mb-6")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            {focus.sourceType === "pathway" ? (
              <Compass className="h-4 w-4 shrink-0 text-foreground" />
            ) : (
              <Map className="h-4 w-4 shrink-0 text-mode-meaning" />
            )}
            <Badge variant="secondary" className="text-xs">
              {focus.shortLabel}
            </Badge>
          </div>
          <p className="font-display font-semibold text-foreground">{focus.detail}</p>
          {!compact && (
            <p className="mt-0.5 truncate text-sm text-muted">{focus.label}</p>
          )}
        </div>
        <Button variant="ghost" size="sm" asChild className="shrink-0">
          <Link href={changeHref}>
            Change
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
      {focusProgress.activeCount > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-foreground transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs tabular-nums text-muted">
            {focusProgress.confirmedCount} / {focusProgress.activeCount} meanings confirmed
          </p>
        </div>
      )}
    </Card>
  );
}

export function ChooseStudyFocus({
  suggestedBatchTitle,
  suggestedBatchNumber,
  islandCount,
}: {
  suggestedBatchTitle: string;
  suggestedBatchNumber: number;
  islandCount: number;
}) {
  return (
    <div className="mb-6 space-y-3">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">Choose your focus</h2>
        <p className="mt-1 text-sm text-muted">
          Follow the main pathway for daily progress, or pick a topic island anytime.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        <Link href={`/batch?source=pathway&batch=${suggestedBatchNumber}`}>
          <Card variant="interactive" className="h-full border-l-4 border-l-foreground p-4">
            <Compass className="mb-2 h-5 w-5 text-foreground" />
            <p className="font-semibold text-foreground">Continue main pathway</p>
            <p className="mt-1 text-xs text-muted">
              Core curriculum in order — your default daily study.
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              Batch {suggestedBatchNumber}: {suggestedBatchTitle}
            </p>
            <Button className="mt-3 w-full" size="sm">
              Start batch
            </Button>
          </Card>
        </Link>
        <Link href="/batch?source=island">
          <Card variant="interactive" className="h-full border-l-4 border-l-mode-meaning p-4">
            <Map className="mb-2 h-5 w-5 text-mode-meaning" />
            <p className="font-semibold text-foreground">Study an island</p>
            <p className="mt-1 text-xs text-muted">
              Optional topic sets — situational practice when you want a theme.
            </p>
            <p className="mt-2 text-sm text-muted">
              {islandCount > 0
                ? `${islandCount} island${islandCount === 1 ? "" : "s"} available`
                : "Create one with AI on the Study page"}
            </p>
            <Button variant="secondary" className="mt-3 w-full" size="sm">
              Browse islands
            </Button>
          </Card>
        </Link>
      </div>
    </div>
  );
}
