"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useApp } from "@/components/providers/app-provider";
import {
  clampBatchSize,
  getActiveBatchSentences,
  initializeBatch,
  isFormalStudyEligibleScene,
} from "@/lib/services/batch-service";
import { getNextStudyHref } from "@/lib/services/study-flow-service";
import type { BatchConfig } from "@/types/progress";
import type { Dataset } from "@/types/sentence";
import type { UserProgress } from "@/types/progress";

type ApplyBatchOptions = {
  redirect?: boolean;
  welcome?: boolean;
};

export function useBatchStart(
  batchSize: number,
  pathwayBatch: string,
  sceneKey: string,
  subtopic: string
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dataset, progress, setProgress } = useApp();
  const autoStartRef = useRef(false);

  const applyBatch = useCallback(
    async (
      config: Omit<BatchConfig, "activeSentenceIds">,
      options: ApplyBatchOptions = { redirect: true, welcome: true }
    ) => {
      if (!dataset) return false;
      if (
        config.sourceType === "scene" &&
        !isFormalStudyEligibleScene(dataset, config.sceneKey)
      ) {
        toast.error("Narration scenes are for listening, not study sessions.");
        return false;
      }

      const normalizedBatchSize = clampBatchSize(batchSize);
      const pathwayBatchNumber =
        config.sourceType === "pathway" ? Number(pathwayBatch) : null;

      if (
        config.sourceType === "pathway" &&
        (!pathwayBatchNumber || Number.isNaN(pathwayBatchNumber))
      ) {
        toast.error("Select a valid pathway batch");
        return false;
      }

      const result = initializeBatch(
        dataset,
        {
          ...config,
          pathwayBatchNumber,
          batchSize: normalizedBatchSize,
        },
        {
          ...progress,
          settings: { ...progress.settings, batchSize: normalizedBatchSize },
        }
      );

      const count = result.config.activeSentenceIds.length;
      if (count === 0) {
        toast.error(
          "No sentences available in this batch. Try another batch or scene."
        );
        return false;
      }

      await setProgress(result.progress);
      toast.success(`Batch started with ${count} sentences`);

      if (options.redirect !== false) {
        const href = getNextStudyHref(dataset, result.progress, {
          welcome: options.welcome,
        });
        router.push(href);
      }

      return true;
    },
    [batchSize, dataset, pathwayBatch, progress, router, setProgress]
  );

  useEffect(() => {
    if (autoStartRef.current) return;
    if (searchParams.get("autoStart") !== "1") return;
    if (!dataset) return;

    autoStartRef.current = true;

    const source = searchParams.get("source");
    const batchParam = searchParams.get("batch");
    const batchNumber =
      batchParam !== null ? Number(batchParam) : null;

    void (async () => {
      if (source === "pathway" && batchNumber && !Number.isNaN(batchNumber)) {
        await applyBatch({
          sourceType: "pathway",
          pathwayBatchNumber: batchNumber,
          sceneKey: null,
          subtopic: null,
          batchSize: clampBatchSize(batchSize),
        });
      } else if (source === "scene" && sceneKey) {
        await applyBatch({
          sourceType: "scene",
          pathwayBatchNumber: null,
          sceneKey,
          subtopic: subtopic === "all" ? null : subtopic,
          batchSize: clampBatchSize(batchSize),
        });
      }
    })();
  }, [applyBatch, batchSize, dataset, sceneKey, searchParams, subtopic]);

  return { applyBatch, dataset, progress };
}

export function getActiveBatchNumber(progress: UserProgress): number | null {
  if (
    progress.batchConfig?.sourceType === "pathway" &&
    progress.batchConfig.pathwayBatchNumber !== null
  ) {
    return progress.batchConfig.pathwayBatchNumber;
  }
  return null;
}

export function hasActiveBatch(
  dataset: Dataset | null,
  progress: UserProgress
): boolean {
  if (!dataset || !progress.batchConfig) return false;
  return getActiveBatchSentences(dataset, progress).length > 0;
}
