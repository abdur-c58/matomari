"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { useRequireDialectBeforeTranslate } from "@/hooks/use-require-dialect";

export type EnsureTranslatedStatus = "idle" | "loading" | "ready" | "error";

export function useEnsureTranslated(sentenceIds: string[]) {
  const { ensureTranslated } = useApp();
  const requireDialect = useRequireDialectBeforeTranslate();
  const [status, setStatus] = useState<EnsureTranslatedStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const idsKey = sentenceIds.join(",");

  const run = useCallback(async () => {
    if (sentenceIds.length === 0) {
      setStatus("ready");
      return;
    }
    if (!requireDialect()) {
      setStatus("idle");
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
  }, [ensureTranslated, sentenceIds, requireDialect]);

  useEffect(() => {
    setStatus("idle");
    run();
  }, [idsKey, run]);

  return { status, error, retry: run };
}
