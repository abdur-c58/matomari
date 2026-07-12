"use client";

import type { PathwayBatchStat } from "@/lib/services/study-focus-service";
import { getActiveBatchProgressForPathwayBatch } from "@/lib/services/study-focus-service";
import type { Dataset } from "@/types/sentence";
import type { UserProgress } from "@/types/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PathwayBatchList({
  batches,
  selectedBatch,
  suggestedBatch,
  activeBatchNumber = null,
  dataset,
  progress,
  onSelect,
}: {
  batches: PathwayBatchStat[];
  selectedBatch: number;
  suggestedBatch: number;
  activeBatchNumber?: number | null;
  dataset?: Dataset | null;
  progress?: UserProgress | null;
  onSelect: (batchNumber: number) => void;
}) {
  return (
    <div className="max-h-80 space-y-2 overflow-y-auto pr-1 md:max-h-none md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3">
      {batches.map((batch) => {
        const selected = batch.batchNumber === selectedBatch;
        const recommended = batch.batchNumber === suggestedBatch && !batch.complete;
        const isActiveFocus = batch.batchNumber === activeBatchNumber;

        const detail =
          dataset && progress
            ? getActiveBatchProgressForPathwayBatch(dataset, progress, batch.batchNumber)
            : null;

        const barPct = isActiveFocus && detail && detail.active > 0
          ? Math.round((detail.confirmed / detail.active) * 100)
          : batch.percentComplete;

        return (
          <button
            key={batch.batchNumber}
            type="button"
            onClick={() => onSelect(batch.batchNumber)}
            className="w-full text-left"
          >
            <Card
              className={cn(
                "p-3 transition-all duration-150",
                selected
                  ? "border-foreground bg-foreground/5 shadow-sm"
                  : "hover:border-foreground/30 desktop-hover-lift"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted">
                      Batch {batch.batchNumber}
                    </span>
                    {recommended && <Badge variant="default">Recommended</Badge>}
                    {batch.complete && <Badge variant="success">Complete</Badge>}
                    {isActiveFocus && <Badge variant="secondary">Active</Badge>}
                  </div>
                  <p className="mt-0.5 font-medium text-foreground">{batch.title}</p>
                  <p className="text-xs text-muted">
                    Difficulty {batch.difficultyRange[0]}–{batch.difficultyRange[1]}
                  </p>
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <div className="h-1 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-foreground transition-[width] duration-300"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
                <p className="text-xs tabular-nums text-muted">
                  {isActiveFocus && detail
                    ? `${detail.confirmed} / ${detail.active} meanings confirmed`
                    : `${batch.studied} / ${batch.total} touched`}
                </p>
              </div>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
