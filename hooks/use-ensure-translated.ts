"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers/app-provider";

export type EnsureTranslatedStatus = "idle" | "loading" | "ready" | "error";

export function useEnsureTranslated(sentenceIds: string[]) {
  const { ensureTranslated } = useApp();
  const idsKey = sentenceIds.join(",");
  const [status, setStatus] = useState<EnsureTranslatedStatus>(() =>
    sentenceIds.length === 0 ? "ready" : "loading"
  );
  const [error, setError] = useState<string | null>(null);

  const sentenceIdsRef = useRef(sentenceIds);
  const ensureTranslatedRef = useRef(ensureTranslated);

  useEffect(() => {
    sentenceIdsRef.current = sentenceIds;
    ensureTranslatedRef.current = ensureTranslated;
  }, [sentenceIds, ensureTranslated]);

  const run = useCallback(async () => {
    const ids = sentenceIdsRef.current.filter(Boolean);
    if (ids.length === 0) {
      setStatus("ready");
      return;
    }

    setStatus("loading");
    setError(null);
    try {
      await ensureTranslatedRef.current(ids);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Translation failed");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const ids = sentenceIdsRef.current.filter(Boolean);
      if (ids.length === 0) {
        if (!cancelled) setStatus("ready");
        return;
      }

      if (!cancelled) {
        setStatus("loading");
        setError(null);
      }

      try {
        await ensureTranslatedRef.current(ids);
        if (!cancelled) setStatus("ready");
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setError(e instanceof Error ? e.message : "Translation failed");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  return { status, error, retry: run };
}
