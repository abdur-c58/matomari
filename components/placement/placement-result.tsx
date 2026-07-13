"use client";

import type { PlacementLevel } from "@/types/progress";
import { PLACEMENT_FLUENCY_OPTIONS } from "@/lib/constants/pathway-placement";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function levelLabel(level: PlacementLevel): string {
  return PLACEMENT_FLUENCY_OPTIONS.find((o) => o.value === level)?.label ?? level;
}

export function PlacementResult({
  startingBatch,
  batchTitle,
  skippedBatchCount,
  level,
  probeAdjusted,
  loading,
  onConfirm,
  onBack,
}: {
  startingBatch: number;
  batchTitle: string;
  skippedBatchCount: number;
  level: PlacementLevel;
  probeAdjusted: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Your starting point
        </h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Based on your answers, here&apos;s where we&apos;ll begin on the main pathway.
        </p>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{levelLabel(level)}</Badge>
          {probeAdjusted && <Badge variant="outline">Fine-tuned by quick check</Badge>}
        </div>
        <p className="mt-4 font-display text-xl font-semibold text-foreground">
          Batch {startingBatch}: {batchTitle}
        </p>
        {skippedBatchCount > 0 ? (
          <p className="mt-2 text-sm text-muted">
            We&apos;ll mark batches 1–{startingBatch - 1} as already known ({skippedBatchCount}{" "}
            earlier {skippedBatchCount === 1 ? "batch" : "batches"}) so you can focus on new
            material.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">
            You&apos;re starting from the beginning — perfect for building a solid foundation.
          </p>
        )}
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        {onBack && (
          <Button variant="outline" className="flex-1" onClick={onBack} disabled={loading}>
            Back
          </Button>
        )}
        <Button className="flex-1" size="lg" onClick={onConfirm} loading={loading}>
          Start studying
        </Button>
      </div>
    </div>
  );
}
