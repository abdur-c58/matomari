"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/providers/app-provider";

export type EnsureTranslatedStatus = "idle" | "loading" | "ready" | "error";

export function useEnsureTranslated(sentenceIds: string[]) {
  const { ensureTranslated } = useApp();
  const [status, setStatus] = useState<EnsureTranslatedStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const idsKey = sentenceIds.join(",");

  const run = useCallback(async () => {
    if (sentenceIds.length === 0) {
      setStatus("ready");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      await ensureTranslated(sentenceIds);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Translation failed");
    }
  }, [ensureTranslated, sentenceIds]);

  useEffect(() => {
    setStatus("idle");
    run();
  }, [idsKey, run]);

  return { status, error, retry: run };
}
