"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useApp } from "@/components/providers/app-provider";
import { clampBatchSize, resumeOrInitializeBatch } from "@/lib/services/batch-service";
import {
  getSwitchFromLabel,
  getSwitchToLabel,
  needsStudySwitch,
  saveIslandBatchSnapshot,
} from "@/lib/services/daily-focus-service";
import { getNextStudyHref } from "@/lib/services/study-flow-service";
import { touchStudyUnit, type StudyUnitRef } from "@/lib/services/study-unit-service";
import type { BatchConfig } from "@/types/progress";

type SwitchPrompt = {
  config: Pick<
    BatchConfig,
    "sourceType" | "pathwayBatchNumber" | "islandKey" | "subtopic"
  >;
  unitRef?: StudyUnitRef;
  fromLabel: string;
  toLabel: string;
  resolve: (started: boolean) => void;
};

export function useFormalStudyStart() {
  const router = useRouter();
  const { dataset, progress, setProgress } = useApp();
  const [switchPrompt, setSwitchPrompt] = useState<SwitchPrompt | null>(null);

  const applyStart = useCallback(
    async (
      config: Pick<
        BatchConfig,
        "sourceType" | "pathwayBatchNumber" | "islandKey" | "subtopic"
      >,
      unitRef?: StudyUnitRef,
      baseProgress = progress
    ) => {
      if (!dataset) return false;

      const batchSize = clampBatchSize(baseProgress.settings.batchSize);
      let nextBase = baseProgress;

      const current = baseProgress.batchConfig;
      if (
        current &&
        current.sourceType === "island" &&
        current.islandKey &&
        (config.sourceType !== "island" ||
          config.islandKey !== current.islandKey)
      ) {
        nextBase = saveIslandBatchSnapshot(baseProgress, current.islandKey);
      }

      const result = resumeOrInitializeBatch(
        dataset,
        { ...config, batchSize },
        nextBase
      );

      const count = result.config.activeSentenceIds.length;
      if (count === 0) {
        toast.error("No sentences available to study in this selection.");
        return false;
      }

      let nextProgress = result.progress;
      if (unitRef) {
        nextProgress = touchStudyUnit(nextProgress, unitRef);
      }

      await setProgress(nextProgress);
      const href = getNextStudyHref(dataset, nextProgress, { welcome: true });
      router.push(href);
      return true;
    },
    [dataset, progress, router, setProgress]
  );

  const startFormalStudy = useCallback(
    async (
      config: Pick<
        BatchConfig,
        "sourceType" | "pathwayBatchNumber" | "islandKey" | "subtopic"
      >,
      unitRef?: StudyUnitRef
    ) => {
      if (!dataset) return false;

      if (needsStudySwitch(progress, config)) {
        return new Promise<boolean>((resolve) => {
          setSwitchPrompt({
            config,
            unitRef,
            fromLabel: getSwitchFromLabel(progress, dataset),
            toLabel: getSwitchToLabel(config, dataset),
            resolve,
          });
        });
      }

      return applyStart(config, unitRef);
    },
    [applyStart, dataset, progress]
  );

  const confirmSwitch = useCallback(async () => {
    if (!switchPrompt) return;
    const { config, unitRef, resolve } = switchPrompt;
    setSwitchPrompt(null);
    const started = await applyStart(config, unitRef);
    resolve(started);
  }, [applyStart, switchPrompt]);

  const cancelSwitch = useCallback(() => {
    if (!switchPrompt) return;
    switchPrompt.resolve(false);
    setSwitchPrompt(null);
  }, [switchPrompt]);

  return {
    startFormalStudy,
    switchPrompt,
    confirmSwitch,
    cancelSwitch,
    dataset,
    progress,
  };
}
