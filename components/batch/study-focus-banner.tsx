"use client";

import Link from "next/link";
import { Map, ChevronRight } from "lucide-react";
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
  hideProgress = false,
}: {
  focus: StudyFocus;
  progress: StudyFocusProgress;
  changeHref?: string;
  compact?: boolean;
  hideProgress?: boolean;
}) {
  const pct =
    focusProgress.activeCount > 0
      ? Math.round((focusProgress.confirmedCount / focusProgress.activeCount) * 100)
      : 0;

  if (focus.sourceType === "pathway") {
    return (
      <Card className={cn("p-4", compact ? "mb-4" : "mb-6")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold text-foreground">
              Pick an island to study
            </p>
            <p className="mt-0.5 text-sm text-muted">
              The main pathway has been replaced by topic islands.
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/batch">
              Browse
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("p-4", compact ? "mb-4" : "mb-6")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Map className="h-4 w-4 shrink-0 text-mode-meaning" />
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
          <Link href={changeHref ?? focus.detailHref}>
            Change
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
      {focusProgress.activeCount > 0 && !hideProgress && (
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

export function ChooseStudyFocus({ islandCount }: { islandCount: number }) {
  return (
    <div className="mb-6 space-y-3">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Choose your focus
        </h2>
        <p className="mt-1 text-sm text-muted">
          Pick a topic island to practice situational Japanese.
        </p>
      </div>
      <Link href="/batch">
        <Card variant="interactive" className="border-l-4 border-l-mode-meaning p-4">
          <Map className="mb-2 h-5 w-5 text-mode-meaning" />
          <p className="font-semibold text-foreground">Study an island</p>
          <p className="mt-1 text-xs text-muted">
            Premade themes and your own islands — situational practice anytime.
          </p>
          <p className="mt-2 text-sm text-muted">
            {islandCount > 0
              ? `${islandCount} island${islandCount === 1 ? "" : "s"} available`
              : "Browse premade islands or create your own"}
          </p>
          <Button variant="secondary" className="mt-3 w-full" size="sm">
            Browse islands
          </Button>
        </Card>
      </Link>
    </div>
  );
}
