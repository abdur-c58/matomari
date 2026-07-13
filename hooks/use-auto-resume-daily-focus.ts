"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/components/providers/app-provider";
import { resumeOrInitializeBatch } from "@/lib/services/batch-service";
import {
  resolveDailyBatchConfig,
  touchStudyUnitFromConfig,
} from "@/lib/services/daily-focus-service";
import { touchStudyUnit } from "@/lib/services/study-unit-service";

/**
 * When the user has no active batchConfig but a resumable island/pathway exists,
 * persist the resolved batch so Today checklist and continue progress work.
 */
export function useAutoResumeDailyFocus() {
  const { dataset, progress, setProgress } = useApp();
  const resumedRef = useRef(false);

  useEffect(() => {
    if (!dataset || progress.batchConfig || resumedRef.current) return;

    const resolved = resolveDailyBatchConfig(dataset, progress);
    if (!resolved) return;

    resumedRef.current = true;

    void (async () => {
      const result = resumeOrInitializeBatch(
        dataset,
        {
          sourceType: resolved.sourceType,
          pathwayBatchNumber: resolved.pathwayBatchNumber,
          islandKey: resolved.islandKey,
          subtopic: resolved.subtopic,
          batchSize: resolved.batchSize,
        },
        progress
      );

      if (result.config.activeSentenceIds.length === 0) return;

      const unitRef = touchStudyUnitFromConfig(result.progress, result.config);
      const nextProgress = touchStudyUnit(result.progress, unitRef);
      await setProgress(nextProgress);
    })();
  }, [dataset, progress, setProgress]);
}
