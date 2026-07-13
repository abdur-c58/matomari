"use client";

import { useSearchParams } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { AppGate } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { StudyUnitDetailShell } from "@/components/study/study-unit-detail-shell";
import { getSuggestedPathwayBatch } from "@/lib/services/study-focus-service";

export function PathwayDetailScreen() {
  const { dataset, progress } = useApp();
  const searchParams = useSearchParams();
  const batchParam = searchParams.get("batch");
  const parsedBatch = batchParam ? Number(batchParam) : null;
  const initialBatch =
    parsedBatch && Number.isFinite(parsedBatch) && parsedBatch > 0
      ? parsedBatch
      : dataset
        ? getSuggestedPathwayBatch(dataset, progress)
        : 1;

  return (
    <AppGate>
      <PageShell className="md:max-w-6xl">
        <StudyUnitDetailShell
          title="Main Pathway"
          description=""
          isPathway
          pathwayBatchNumber={initialBatch}
          themeKanji="道"
        />
      </PageShell>
    </AppGate>
  );
}
