"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/components/providers/app-provider";
import {
  fetchIslandThemeKanji,
  islandsMissingThemeKanji,
} from "@/lib/services/study-unit-kanji-service";

/**
 * Backfills themeKanji on islands that don't have one yet (background, non-blocking).
 */
export function useEnsureIslandKanji() {
  const { dataset, setIslandThemeKanji } = useApp();
  const runningRef = useRef(false);

  useEffect(() => {
    if (!dataset || runningRef.current) return;

    const missing = islandsMissingThemeKanji(dataset);
    if (missing.length === 0) return;

    runningRef.current = true;

    void (async () => {
      for (const key of missing) {
        const island = dataset.islands[key];
        if (!island || island.themeKanji) continue;

        const kanji = await fetchIslandThemeKanji({
          title: key.replace(/_/g, " "),
          description: island.description,
          subtopics: island.subtopics,
        });

        if (kanji) {
          await setIslandThemeKanji(key, kanji);
        }
      }
      runningRef.current = false;
    })();
  }, [dataset, setIslandThemeKanji]);
}
