"use client";

import type { PathwayBatchStat } from "@/lib/services/study-focus-service";
import { cn } from "@/lib/utils";

export function PathwayBatchPills({
  batches,
  selectedBatch,
  onSelect,
}: {
  batches: PathwayBatchStat[];
  selectedBatch: number;
  onSelect: (batchNumber: number) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {batches.map((batch) => {
        const selected = batch.batchNumber === selectedBatch;
        return (
          <button
            key={batch.batchNumber}
            type="button"
            onClick={() => onSelect(batch.batchNumber)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-left text-xs transition-colors",
              selected
                ? "border-orange-500/50 bg-orange-500/10 font-medium text-foreground"
                : "border-border bg-surface text-muted hover:border-foreground/20"
            )}
          >
            <span className="block font-medium">Batch {batch.batchNumber}</span>
            <span className="block max-w-[10rem] truncate">{batch.title}</span>
          </button>
        );
      })}
    </div>
  );
}
