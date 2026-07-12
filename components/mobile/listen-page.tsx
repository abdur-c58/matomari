"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useApp } from "@/components/providers/app-provider";
import { AppGate, EmptyState } from "@/components/layout/empty-state";
import { PreparingSentences } from "@/components/layout/preparing-sentences";
import { MeaningCheck } from "@/components/listen/meaning-check";
import { ShadowingMode } from "@/components/listen/shadowing-mode";
import { getActiveBatchSentences } from "@/lib/services/batch-service";
import { useEnsureTranslated } from "@/hooks/use-ensure-translated";
import { Card } from "@/components/ui/card";

export function ListenPageMobile() {
  const router = useRouter();
  const { dataset, progress, updateProgress } = useApp();
  const searchParams = useSearchParams();
  const step = searchParams.get("step");
  const welcome = searchParams.get("welcome") === "1";
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

  const handleMeaningComplete = useCallback(() => {
    toast.success("Up next: listen and shadow each sentence");
    router.replace("/listen?step=shadow");
    setPhase("shadow");
  }, [router]);

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
      <>
        {welcome && (
          <div className="px-4 pt-4">
            <Card className="border-l-4 border-l-foreground p-4">
              <p className="text-sm font-medium text-foreground">
                Step 1: Confirm meanings
              </p>
              <p className="mt-1 text-sm text-muted">
                Before listening, make sure you understand what each sentence means.
              </p>
            </Card>
          </div>
        )}
        <MeaningCheck
          sentences={unconfirmed}
          onConfirm={handleConfirm}
          onComplete={handleMeaningComplete}
        />
      </>
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
