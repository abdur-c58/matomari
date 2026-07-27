"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/components/providers/app-provider";
import {
  fetchSceneThemeKanji,
  scenesMissingThemeKanji,
} from "@/lib/services/study-unit-kanji-service";

/**
 * Backfills themeKanji on scenes that don't have one yet (background, non-blocking).
 */
export function useEnsureSceneKanji() {
  const { dataset, setSceneThemeKanji } = useApp();
  const runningRef = useRef(false);

  useEffect(() => {
    if (!dataset || runningRef.current) return;

    const missing = scenesMissingThemeKanji(dataset);
    if (missing.length === 0) return;

    runningRef.current = true;

    void (async () => {
      for (const key of missing) {
        const scene = dataset.scenes[key];
        if (!scene || scene.themeKanji) continue;

        const kanji = await fetchSceneThemeKanji({
          title: key.replace(/_/g, " "),
          description: scene.description,
          subtopics: scene.subtopics,
        });

        if (kanji) {
          await setSceneThemeKanji(key, kanji);
        }
      }
      runningRef.current = false;
    })();
  }, [dataset, setSceneThemeKanji]);
}
