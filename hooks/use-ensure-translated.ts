"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { preferencesPathWithReturn } from "@/lib/utils/dialect-preferences";

export type EnsureTranslatedStatus = "idle" | "loading" | "ready" | "error";

export function useEnsureTranslated(sentenceIds: string[]) {
  const { ensureTranslated, isDialectConfigured } = useApp();
  const router = useRouter();
  const idsKey = sentenceIds.join(",");
  const [status, setStatus] = useState<EnsureTranslatedStatus>(() =>
    sentenceIds.length === 0 ? "ready" : "loading"
  );
  const [error, setError] = useState<string | null>(null);

  const sentenceIdsRef = useRef(sentenceIds);
  sentenceIdsRef.current = sentenceIds;

  const ensureTranslatedRef = useRef(ensureTranslated);
  ensureTranslatedRef.current = ensureTranslated;

  const run = useCallback(async () => {
    const ids = sentenceIdsRef.current.filter(Boolean);
    if (ids.length === 0) {
      setStatus("ready");
      return;
    }

    if (!isDialectConfigured) {
      router.push(
        preferencesPathWithReturn(
          window.location.pathname + window.location.search
        )
      );
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
  }, [isDialectConfigured, router]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const ids = sentenceIdsRef.current.filter(Boolean);
      if (ids.length === 0) {
        if (!cancelled) setStatus("ready");
        return;
      }

      if (!isDialectConfigured) {
        router.push(
          preferencesPathWithReturn(
            window.location.pathname + window.location.search
          )
        );
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
  }, [idsKey, isDialectConfigured, router]);

  return { status, error, retry: run };
}
