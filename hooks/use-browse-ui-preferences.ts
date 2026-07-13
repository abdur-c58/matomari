"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IslandBrowseDisplay } from "@/lib/constants/island-browse";
import {
  patchBrowseUiPreferences,
  readBrowseUiPreferences,
  type BrowseUiPreferences,
} from "@/lib/preferences/browse-ui-preferences";

type ProgressBrowseDefaults = Partial<
  Pick<
    BrowseUiPreferences,
    "islandBrowseDisplay" | "casualPlaylistPauseMs" | "casualPlaylistPlaybackRate"
  >
>;

export function useBrowseUiPreferences(progressDefaults?: ProgressBrowseDefaults) {
  const migratedRef = useRef(false);
  const [prefs, setPrefs] = useState<BrowseUiPreferences>(() =>
    readBrowseUiPreferences(progressDefaults)
  );

  useEffect(() => {
    if (migratedRef.current || !progressDefaults) return;
    migratedRef.current = true;

    if (typeof window === "undefined") return;
    if (window.localStorage.getItem("language:browse-ui-v1")) return;

    const seeded = readBrowseUiPreferences(progressDefaults);
    setPrefs(seeded);
    patchBrowseUiPreferences(seeded);
  }, [progressDefaults]);

  const setDisplayMode = useCallback((mode: IslandBrowseDisplay) => {
    setPrefs((current) => {
      const next = { ...current, islandBrowseDisplay: mode };
      patchBrowseUiPreferences({ islandBrowseDisplay: mode });
      return next;
    });
  }, []);

  const updatePlaybackSettings = useCallback(
    (patch: {
      casualPlaylistPauseMs?: number;
      casualPlaylistPlaybackRate?: number;
    }) => {
      setPrefs((current) => {
        const next = { ...current, ...patch };
        patchBrowseUiPreferences(patch);
        return next;
      });
    },
    []
  );

  return {
    displayMode: prefs.islandBrowseDisplay,
    pauseMs: prefs.casualPlaylistPauseMs,
    playbackRate: prefs.casualPlaylistPlaybackRate,
    setDisplayMode,
    updatePlaybackSettings,
  };
}
