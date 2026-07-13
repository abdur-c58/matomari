"use client";

import Link from "next/link";
import { Compass, Map } from "lucide-react";
import type { StudyUnitSummary } from "@/lib/services/study-unit-service";
import { DecoratedStudySurface } from "@/components/study/decorated-study-surface";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StudyUnitCard({
  unit,
  href,
}: {
  unit: StudyUnitSummary;
  href: string;
}) {
  const pct =
    unit.sentenceCount > 0
      ? Math.round((unit.studiedCount / unit.sentenceCount) * 100)
      : 0;

  return (
    <Link href={href} className="group block">
      <DecoratedStudySurface
        kanji={unit.themeKanji}
        variant={unit.isPathway ? "pathway" : "island"}
        className={cn(
          "min-h-[4.5rem] rounded-xl border border-border/70 p-3 transition-all",
          unit.isPathway && "border-orange-300/40",
          "hover:border-foreground/30 desktop-hover-lift"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              unit.isPathway
                ? "bg-orange-500/15 text-orange-700"
                : "bg-surface-raised text-foreground"
            )}
          >
            {unit.isPathway ? (
              <Compass className="h-4 w-4" />
            ) : (
              <Map className="h-4 w-4" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-foreground">{unit.title}</p>
              {unit.complete && <Badge variant="success">Complete</Badge>}
              {unit.status === "in_progress" && !unit.complete && (
                <Badge variant="secondary">In progress</Badge>
              )}
            </div>
            <p className="truncate text-xs text-muted">{unit.description}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-foreground transition-[width]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="shrink-0 text-[10px] tabular-nums text-muted">
                {unit.studiedCount}/{unit.sentenceCount}
              </span>
            </div>
          </div>
        </div>
      </DecoratedStudySurface>
    </Link>
  );
}
