"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import type { PlacementLevel } from "@/types/progress";
import type { ProbeRating } from "@/lib/constants/pathway-placement";
import {
  applyPathwayPlacement,
  getPathwayBatchTitle,
  refineStartingBatch,
  selectProbeSentences,
  startingBatchFromLevel,
} from "@/lib/services/placement-service";
import { PlacementSelfAssess } from "@/components/placement/placement-self-assess";
import { PlacementProbe } from "@/components/placement/placement-probe";
import { PlacementResult } from "@/components/placement/placement-result";
import { AppGate, LoadingState } from "@/components/layout/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

type PlacementStep = "assess" | "probe" | "result";

export function PlacementFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRetake = searchParams.get("retake") === "1";
  const { dataset, progress, setProgress, loading } = useApp();

  const [step, setStep] = useState<PlacementStep>("assess");
  const [level, setLevel] = useState<PlacementLevel | null>(null);
  const [levelMode, setLevelMode] = useState<"fluency" | "jlpt">("fluency");
  const [selfAssessedBatch, setSelfAssessedBatch] = useState(1);
  const [startingBatch, setStartingBatch] = useState(1);
  const [probeAdjustments, setProbeAdjustments] = useState<number | undefined>();
  const [applying, setApplying] = useState(false);

  const probeSentences = useMemo(() => {
    if (!dataset || step !== "probe") return [];
    return selectProbeSentences(dataset, selfAssessedBatch);
  }, [dataset, selfAssessedBatch, step]);

  const batchTitle = useMemo(() => {
    if (!dataset) return "";
    return getPathwayBatchTitle(dataset, startingBatch);
  }, [dataset, startingBatch]);

  const skippedBatchCount = startingBatch > 1 ? startingBatch - 1 : 0;
  const probeAdjusted =
    probeAdjustments !== undefined && probeAdjustments !== 0;

  const handleAssessContinue = useCallback(
    (pickedLevel: PlacementLevel, mode: "fluency" | "jlpt") => {
      setLevel(pickedLevel);
      setLevelMode(mode);
      const batch = startingBatchFromLevel(pickedLevel);
      setSelfAssessedBatch(batch);

      if (pickedLevel === "brand_new") {
        setStartingBatch(batch);
        setProbeAdjustments(undefined);
        setStep("result");
      } else {
        setStep("probe");
      }
    },
    []
  );

  // If probe samples are unavailable, skip straight to result at self-assessed batch.
  useEffect(() => {
    if (step !== "probe" || probeSentences.length > 0) return;
    setStartingBatch(selfAssessedBatch);
    setProbeAdjustments(0);
    setStep("result");
  }, [step, probeSentences.length, selfAssessedBatch]);

  const handleProbeComplete = useCallback(
    (ratings: ProbeRating[]) => {
      const refined = refineStartingBatch(selfAssessedBatch, ratings);
      setStartingBatch(refined.startingBatch);
      setProbeAdjustments(refined.probeAdjustments);
      setStep("result");
    },
    [selfAssessedBatch]
  );

  const handleConfirm = useCallback(async () => {
    if (!dataset || !level) return;
    setApplying(true);
    try {
      const { progress: next } = applyPathwayPlacement(dataset, progress, {
        level,
        levelMode,
        startingBatch,
        probeAdjustments,
        retake: isRetake,
      });
      await setProgress(next);
      router.replace(`/batch?source=pathway&batch=${startingBatch}&autoStart=1`);
    } finally {
      setApplying(false);
    }
  }, [
    dataset,
    level,
    levelMode,
    startingBatch,
    probeAdjustments,
    isRetake,
    progress,
    setProgress,
    router,
  ]);

  if (loading) {
    return (
      <>
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </>
    );
  }

  if (!dataset) {
    return <LoadingState />;
  }

  return (
    <AppGate>
      {step === "assess" && (
        <PlacementSelfAssess onContinue={handleAssessContinue} />
      )}
      {step === "probe" && (
        <PlacementProbe
          sentences={probeSentences}
          onComplete={handleProbeComplete}
          onBack={() => setStep("assess")}
        />
      )}
      {step === "result" && level && (
        <PlacementResult
          startingBatch={startingBatch}
          batchTitle={batchTitle}
          skippedBatchCount={skippedBatchCount}
          level={level}
          probeAdjusted={probeAdjusted}
          loading={applying}
          onConfirm={() => void handleConfirm()}
          onBack={
            level === "brand_new" ? () => setStep("assess") : () => setStep("probe")
          }
        />
      )}
    </AppGate>
  );
}
