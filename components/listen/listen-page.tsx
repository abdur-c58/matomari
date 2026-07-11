"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { AppGate, EmptyState } from "@/components/layout/empty-state";
import { PreparingSentences } from "@/components/layout/preparing-sentences";
import { MeaningCheck } from "./meaning-check";
import { ShadowingMode } from "./shadowing-mode";
import { getActiveBatchSentences } from "@/lib/services/batch-service";
import { useEnsureTranslated } from "@/hooks/use-ensure-translated";

export function ListenPage() {
  const { dataset, progress, updateProgress } = useApp();
  const searchParams = useSearchParams();
  const step = searchParams.get("step");
  const [phase, setPhase] = useState<"meaning" | "shadow">(
    step === "shadow" ? "shadow" : "meaning"
  );

  const activeSentences = useMemo(
    () => (dataset ? getActiveBatchSentences(dataset, progress) : []),
    [dataset, progress]
  );

  const sentenceIds = useMemo(
    () => activeSentences.map((s) => s.id),
    [activeSentences]
  );

  const { status, error, retry } = useEnsureTranslated(sentenceIds);

  const unconfirmed = useMemo(
    () =>
      activeSentences.filter((s) => !progress.sentences[s.id]?.meaningConfirmed),
    [activeSentences, progress]
  );

  const confirmedSentences = useMemo(
    () =>
      activeSentences.filter((s) => progress.sentences[s.id]?.meaningConfirmed),
    [activeSentences, progress]
  );

  useEffect(() => {
    if (step === "shadow" && unconfirmed.length === 0) setPhase("shadow");
    else if (unconfirmed.length > 0) setPhase("meaning");
  }, [step, unconfirmed.length]);

  const handleConfirm = useCallback(
    async (id: string) => {
      await updateProgress(id, (prev) => ({
        ...prev,
        meaningConfirmed: true,
      }));
    },
    [updateProgress]
  );

  if (!progress.batchConfig) {
    return (
      <AppGate>
        <EmptyState
          title="No active batch"
          description="Select a batch to start listening."
          actionHref="/batch"
          actionLabel="Choose batch"
        />
      </AppGate>
    );
  }

  if (status === "loading") {
    return (
      <AppGate>
        <PreparingSentences />
      </AppGate>
    );
  }

  if (status === "error") {
    return (
      <AppGate>
        <PreparingSentences error={error} onRetry={retry} />
      </AppGate>
    );
  }

  if (phase === "meaning" && unconfirmed.length > 0) {
    return (
      <MeaningCheck
        sentences={unconfirmed}
        onConfirm={handleConfirm}
        onComplete={() => setPhase("shadow")}
      />
    );
  }

  if (confirmedSentences.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          title="No confirmed sentences"
          description="Confirm meanings before shadowing."
          actionHref="/listen?step=meaning"
          actionLabel="Confirm meanings"
        />
      </div>
    );
  }

  return <ShadowingMode sentences={confirmedSentences} />;
}
