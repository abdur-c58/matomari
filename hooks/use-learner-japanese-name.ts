"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useApp } from "@/components/providers/app-provider";
import {
  getCachedJapaneseNameReading,
  getLearnerNameSource,
} from "@/lib/sentence/learner-name";
import { ensureJapaneseLearnerName } from "@/lib/services/learner-name-service";

export function useLearnerJapaneseName(): string | null {
  const { data: session } = useSession();
  const { progress, setProgress } = useApp();
  const progressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const source = getLearnerNameSource(session?.user, progress.settings);
  const cached = getCachedJapaneseNameReading(progress.settings, source);
  const [japaneseName, setJapaneseName] = useState<string | null>(cached);
  const inflightRef = useRef<string | null>(null);

  useEffect(() => {
    if (!source) {
      setJapaneseName(null);
      return;
    }

    const hit = getCachedJapaneseNameReading(progressRef.current.settings, source);
    if (hit) {
      setJapaneseName(hit);
      return;
    }

    if (inflightRef.current === source) return;
    inflightRef.current = source;

    let cancelled = false;
    void ensureJapaneseLearnerName(progressRef.current, source, setProgress)
      .then((kana) => {
        if (!cancelled) setJapaneseName(kana);
      })
      .finally(() => {
        if (inflightRef.current === source) inflightRef.current = null;
      });

    return () => {
      cancelled = true;
    };
  }, [
    source,
    setProgress,
    progress.settings.displayName,
    progress.settings.japaneseNameReading,
    progress.settings.japaneseNameSource,
  ]);

  return japaneseName ?? cached;
}
