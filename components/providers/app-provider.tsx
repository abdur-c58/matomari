"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import type { Dataset, Island, UserLibrary } from "@/types/sentence";
import type { SentenceProgress, UserProgress } from "@/types/progress";
import type { AppStats } from "@/types/stats";
import type { AudioSessionState } from "@/types/audio";
import { DEFAULT_PROGRESS, DEFAULT_STATS } from "@/lib/db/index";
import { audioSession } from "@/lib/audio/audio-session";
import { parseDataset } from "@/lib/validation/dataset-schema";
import {
  getDatasetSynced,
  saveDatasetSynced,
  getProgressSynced,
  saveProgressSynced,
  updateSentenceProgressSynced,
  getStatsSynced,
  saveStatsSynced,
  recordDailySnapshotSynced,
  syncAll,
  manualSync,
  loadLocalSnapshot,
  onSyncStatusChange,
  onSyncStatusMessageChange,
  canSyncToCloud,
  type SyncStatus,
  type ManualSyncResult,
} from "@/lib/sync/sync-service";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { addIsland as mergeIsland } from "@/lib/services/dataset-mutation-service";
import { resolveImportDataset } from "@/lib/services/import-service";
import {
  getUntranslatedIds,
  translateSentences,
  type TranslationProgressCallback,
} from "@/lib/services/translation-service";
import { needsRetranslationForDialect } from "@/lib/services/dialect-translation-service";
import {
  preferencesPathWithReturn,
  isDialectConfigured,
} from "@/lib/utils/dialect-preferences";
import {
  clearUploadProgress,
  reportTranslationProgress,
} from "@/lib/upload-progress";

interface AppContextValue {
  dataset: Dataset | null;
  progress: UserProgress;
  stats: AppStats;
  loading: boolean;
  error: string | null;
  syncStatus: SyncStatus;
  syncStatusMessage: string | null;
  lastSyncedAt: string | null;
  manualSync: () => Promise<ManualSyncResult>;
  refresh: () => Promise<void>;
  importDataset: (json: unknown, merge?: boolean) => Promise<void>;
  importDatasets: (payloads: { json: unknown; fileName?: string }[]) => Promise<void>;
  addIsland: (islandKey: string, island: Island) => Promise<void>;
  ensureTranslated: (sentenceIds: string[]) => Promise<void>;
  translateSentenceIds: (
    sentenceIds: string[],
    options?: { onProgress?: TranslationProgressCallback }
  ) => Promise<{ translatedCount: number; total: number }>;
  translateAllUntranslated: (options?: {
    onProgress?: TranslationProgressCallback;
  }) => Promise<{ translatedCount: number; total: number }>;
  retranslateSentence: (sentenceId: string) => Promise<void>;
  sentenceNeedsRetranslation: (sentenceId: string) => boolean;
  isDialectConfigured: boolean;
  updateProgress: (
    sentenceId: string,
    update: Partial<SentenceProgress> | ((prev: SentenceProgress) => SentenceProgress)
  ) => Promise<void>;
  setProgress: (progress: UserProgress) => Promise<void>;
  setStats: (stats: AppStats) => Promise<void>;
  audioState: AudioSessionState;
  unlockAudio: () => Promise<void>;
  audioUnlocked: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [progress, setProgressState] = useState<UserProgress>(DEFAULT_PROGRESS);
  const [stats, setStatsState] = useState<AppStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioState, setAudioState] = useState<AudioSessionState>("locked");
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [userLibrary, setUserLibrary] = useState<UserLibrary | null>(null);

  const applyLocalSnapshot = useCallback(
    async (snapshot: Awaited<ReturnType<typeof loadLocalSnapshot>>) => {
      setDataset(snapshot.dataset);
      setUserLibrary(snapshot.library);
      setProgressState(snapshot.progress);
      setStatsState(snapshot.stats);
      setLastSyncedAt(snapshot.lastSyncedAt);
      return snapshot;
    },
    []
  );

  const syncFromCloud = useCallback(async () => {
    if (!canSyncToCloud()) return null;

    await syncAll();

    const snapshot = await loadLocalSnapshot();
    await applyLocalSnapshot(snapshot);
    return snapshot;
  }, [applyLocalSnapshot]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const local = await loadLocalSnapshot();
      await applyLocalSnapshot(local);

      if (canSyncToCloud()) {
        await syncFromCloud();
      }

      const d = await getDatasetSynced();
      const p = await getProgressSynced();

      if (d) {
        setDataset(d);
        const local = await loadLocalSnapshot();
        setUserLibrary(local.library);

        const hasStoredTranslations =
          local.library?.sentenceTranslations &&
          Object.keys(local.library.sentenceTranslations).length > 0;
        if (hasStoredTranslations && !p.settings.dialectChosen) {
          const updated = {
            ...p,
            settings: { ...p.settings, dialectChosen: true },
          };
          await saveProgressSynced(updated);
          setProgressState(updated);
        }
      }

      if (d) {
        const allIds = Object.keys(p.sentences);
        const mastered = allIds.filter((id) => p.sentences[id]?.rating === 5).length;
        const weak = allIds.filter(
          (id) => p.sentences[id]?.rating !== null && (p.sentences[id]?.rating ?? 0) <= 2
        ).length;
        const total = new Set([
          ...d.main_pathway.batches.flatMap((b) => b.sentences.map((s) => s.id)),
          ...Object.values(d.islands).flatMap((i) => i.sentences.map((s) => s.id)),
        ]).size;
        await recordDailySnapshotSynced({
          date: new Date().toISOString().slice(0, 10),
          weakCount: weak,
          masteredCount: mastered,
          totalSentences: total,
        });
        const updatedStats = await getStatsSynced();
        setStatsState(updatedStats);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [applyLocalSnapshot, syncFromCloud]);

  useEffect(() => {
    refresh();
    audioSession.setListener((state) => {
      setAudioState(state);
      setAudioUnlocked(state !== "locked");
    });
  }, [refresh]);

  useEffect(() => {
    const unsubStatus = onSyncStatusChange(setSyncStatus);
    const unsubMessage = onSyncStatusMessageChange(setSyncStatusMessage);
    return () => {
      unsubStatus();
      unsubMessage();
    };
  }, []);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !session?.user?.supabaseUserId) return;
    void syncFromCloud();
  }, [sessionStatus, session?.user?.supabaseUserId, syncFromCloud]);

  useEffect(() => {
    const handleOnline = () => {
      void syncFromCloud();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncFromCloud]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && canSyncToCloud()) {
        void syncFromCloud();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [syncFromCloud]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const interval = window.setInterval(() => {
      if (canSyncToCloud()) {
        void syncFromCloud();
      }
    }, 5 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, [syncFromCloud]);

  const importDataset = useCallback(
    async (json: unknown) => {
      const parsed = parseDataset(json) as Dataset;
      await saveDatasetSynced(parsed);
      setDataset(parsed);
      await refresh();
    },
    [refresh]
  );

  const importDatasets = useCallback(
    async (payloads: { json: unknown; fileName?: string }[]) => {
      const existing = await getDatasetSynced();
      const merged = resolveImportDataset(payloads, existing);
      await saveDatasetSynced(merged);
      setDataset(merged);
      await refresh();
    },
    [refresh]
  );

  const addIsland = useCallback(
    async (islandKey: string, island: Island) => {
      if (!dataset) throw new Error("No dataset loaded");
      const next = mergeIsland(dataset, islandKey, island);
      await saveDatasetSynced(next);
      setDataset(next);
    },
    [dataset]
  );

  const translateSentenceIds = useCallback(
    async (
      sentenceIds: string[],
      options?: { onProgress?: TranslationProgressCallback }
    ): Promise<{ translatedCount: number; total: number }> => {
      const dialect = progress.settings.dialect;
      const dialectChosen = progress.settings.dialectChosen;

      if (!isDialectConfigured({ dialectChosen })) {
        if (typeof window !== "undefined") {
          window.location.assign(
            preferencesPathWithReturn(window.location.pathname + window.location.search)
          );
        }
        return { translatedCount: 0, total: 0 };
      }

      let current = await getDatasetSynced();
      if (!current || sentenceIds.length === 0) {
        return { translatedCount: 0, total: 0 };
      }

      const untranslatedSet = new Set(getUntranslatedIds(current));
      const untranslatedIds = sentenceIds.filter((id) => untranslatedSet.has(id));
      const total = untranslatedIds.length;
      if (total === 0) {
        return { translatedCount: 0, total: 0 };
      }

      const persist = async (next: Dataset) => {
        await saveDatasetSynced(next);
        current = next;
        setDataset(next);
        const snapshot = await loadLocalSnapshot();
        setUserLibrary(snapshot.library);
      };

      const onProgress: TranslationProgressCallback = (completed, progressTotal) => {
        reportTranslationProgress(completed, progressTotal);
        options?.onProgress?.(completed, progressTotal);
      };

      try {
        const { translatedCount } = await translateSentences(current, untranslatedIds, {
          onProgress,
          persist,
          dialect,
        });

        return { translatedCount, total };
      } catch (e) {
        clearUploadProgress();
        throw e;
      }
    },
    [progress.settings.dialect, progress.settings.dialectChosen]
  );

  const translateAllUntranslated = useCallback(
    async (options?: { onProgress?: TranslationProgressCallback }) => {
      const current = await getDatasetSynced();
      if (!current) return { translatedCount: 0, total: 0 };

      const ids = getUntranslatedIds(current);
      if (ids.length === 0) return { translatedCount: 0, total: 0 };

      return translateSentenceIds(ids, { onProgress: options?.onProgress });
    },
    [translateSentenceIds]
  );

  const ensureTranslated = useCallback(
    async (sentenceIds: string[]) => {
      await translateSentenceIds(sentenceIds);
    },
    [translateSentenceIds]
  );

  const retranslateSentence = useCallback(
    async (sentenceId: string) => {
      if (!dataset) throw new Error("No dataset loaded");
      const { dataset: next } = await translateSentences(dataset, [sentenceId], {
        force: true,
        dialect: progress.settings.dialect,
      });
      await saveDatasetSynced(next);
      setDataset(next);
      const snapshot = await loadLocalSnapshot();
      setUserLibrary(snapshot.library);
    },
    [dataset, progress.settings.dialect]
  );

  const sentenceNeedsRetranslation = useCallback(
    (sentenceId: string) =>
      needsRetranslationForDialect(
        sentenceId,
        progress.settings.dialect,
        userLibrary?.sentenceTranslations
      ),
    [progress.settings.dialect, userLibrary?.sentenceTranslations]
  );

  const updateProgress = useCallback(
    async (
      sentenceId: string,
      update: Partial<SentenceProgress> | ((prev: SentenceProgress) => SentenceProgress)
    ) => {
      const next = await updateSentenceProgressSynced(sentenceId, update);
      setProgressState(next);
    },
    []
  );

  const setProgress = useCallback(async (p: UserProgress) => {
    const previousDialect = progress.settings.dialect;
    await saveProgressSynced(p);
    setProgressState(p);

    if (p.settings.dialect !== previousDialect) {
      const d = await getDatasetSynced();
      if (d) setDataset(d);
    }
  }, [progress.settings.dialect]);

  const setStats = useCallback(async (s: AppStats) => {
    await saveStatsSynced(s);
    setStatsState(s);
  }, []);

  const unlockAudio = useCallback(async () => {
    await audioSession.unlockAudio();
    setAudioUnlocked(audioSession.isUnlocked());
  }, []);

  const runManualSync = useCallback(async () => {
    const result = await manualSync();
    const snapshot = await loadLocalSnapshot();
    await applyLocalSnapshot(snapshot);
    return result;
  }, [applyLocalSnapshot]);

  const value = useMemo(
    () => ({
      dataset,
      progress,
      stats,
      loading,
      error,
      syncStatus,
      syncStatusMessage,
      lastSyncedAt,
      manualSync: runManualSync,
      refresh,
      importDataset,
      importDatasets,
      addIsland,
      ensureTranslated,
      translateSentenceIds,
      translateAllUntranslated,
      retranslateSentence,
      sentenceNeedsRetranslation,
      isDialectConfigured: isDialectConfigured(progress.settings),
      updateProgress,
      setProgress,
      setStats,
      audioState,
      unlockAudio,
      audioUnlocked,
    }),
    [
      dataset,
      progress,
      stats,
      loading,
      error,
      syncStatus,
      syncStatusMessage,
      lastSyncedAt,
      runManualSync,
      refresh,
      importDataset,
      importDatasets,
      addIsland,
      ensureTranslated,
      translateSentenceIds,
      translateAllUntranslated,
      retranslateSentence,
      sentenceNeedsRetranslation,
      progress.settings.dialectChosen,
      updateProgress,
      setProgress,
      setStats,
      audioState,
      unlockAudio,
      audioUnlocked,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
