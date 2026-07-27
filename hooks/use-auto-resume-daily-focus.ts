"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/components/providers/app-provider";
import {
  isFormalStudyEligibleScene,
  resumeOrInitializeBatch,
} from "@/lib/services/batch-service";
import {
  resolveDailyBatchConfig,
  touchStudyUnitFromConfig,
} from "@/lib/services/daily-focus-service";
import { touchStudyUnit } from "@/lib/services/study-unit-service";

function hasActiveSceneBatch(
  dataset: NonNullable<ReturnType<typeof useApp>["dataset"]>,
  progress: ReturnType<typeof useApp>["progress"]
): boolean {
  const config = progress.batchConfig;
  return Boolean(
    config &&
      config.sourceType === "scene" &&
      config.sceneKey &&
      isFormalStudyEligibleScene(dataset, config.sceneKey) &&
      config.activeSentenceIds.length > 0
  );
}

/**
 * Ensure there is always an active scene batch.
 * Pathway / empty / missing focus resolves to 300 Language Essentials (or recent scene).
 */
export function useAutoResumeDailyFocus() {
  const { dataset, progress, setProgress } = useApp();
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!dataset || inFlightRef.current) return;
    if (hasActiveSceneBatch(dataset, progress)) return;

    const resolved = resolveDailyBatchConfig(dataset, progress);
    if (!resolved || resolved.activeSentenceIds.length === 0) return;

    inFlightRef.current = true;

    void (async () => {
      try {
        const result = resumeOrInitializeBatch(
          dataset,
          {
            sourceType: resolved.sourceType,
            pathwayBatchNumber: resolved.pathwayBatchNumber,
            sceneKey: resolved.sceneKey,
            subtopic: resolved.subtopic,
            batchSize: resolved.batchSize,
          },
          progress
        );

        if (result.config.activeSentenceIds.length === 0) return;

        const unitRef = touchStudyUnitFromConfig(result.progress, result.config);
        const nextProgress = touchStudyUnit(result.progress, unitRef);
        await setProgress(nextProgress);
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [dataset, progress, setProgress]);
}
