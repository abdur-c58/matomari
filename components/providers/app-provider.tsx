"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import type { Dataset, Scene, Sentence, SentenceDialectTranslations, TranslatedFields, UserLibrary } from "@/types/sentence";
import type { Dialect } from "@/lib/constants/dialect";
import type { SentenceProgress, UserProgress } from "@/types/progress";
import type { AppStats } from "@/types/stats";
import type { AudioSessionState } from "@/types/audio";
import { DEFAULT_PROGRESS, DEFAULT_STATS } from "@/lib/db/index";
import { appendSentenceTranslations } from "@/lib/db/dataset-repository";
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
  queueLibrarySync,
  flushSyncQueue,
  onSyncStatusChange,
  onSyncStatusMessageChange,
  isBrowserOnline,
  canSyncToCloud,
  type SyncStatus,
  type ManualSyncResult,
} from "@/lib/sync/sync-service";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  addScene as mergeScene,
  appendSentenceToScene as mergeSentenceToScene,
  setSceneThemeKanji as mergeSceneThemeKanji,
} from "@/lib/services/dataset-mutation-service";
import { resolveImportDataset } from "@/lib/services/import-service";
import {
  translateSentences,
  type TranslationProgressCallback,
} from "@/lib/services/translation-service";
import {
  getUntranslatedIdsForDialect,
  getSentenceTranslationFields,
  needsRetranslationForDialect,
} from "@/lib/services/dialect-translation-service";
import { getPrimaryTranslation } from "@/lib/preferences/translation-preferences";
import { readBrowseUiPreferences } from "@/lib/preferences/browse-ui-preferences";
import {
  normalizeUserProgress,
  prepareProgressForSave,
} from "@/lib/progress/dialect-progress";
import {
  clearUploadProgress,
  reportTranslationProgress,
} from "@/lib/upload-progress";
import {
  getDailyStudyStatus,
  mergeTodayStudyComplete,
} from "@/lib/services/daily-progress-service";
import type { PremadeCatalog } from "@/types/premade-catalog";
import { isPremadeSceneKey } from "@/lib/services/shared-premade-service";
import { pullSharedTranslationsIntoLibrary } from "@/lib/services/shared-translations-service";
import {
  fetchResolvedSharedScenes,
  mergeSharedScenesIntoDataset,
} from "@/lib/services/shared-membership-client";
import { mergeSentenceTranslations } from "@/lib/services/dialect-translation-service";
import {
  ensureSceneId,
  newSceneId,
} from "@/lib/services/scene-identity-service";
import { getUserLibrary, saveUserLibrary } from "@/lib/db/dataset-repository";

async function maybeRecordTodayStudyComplete(
  dataset: Dataset | null,
  progress: UserProgress,
  stats: AppStats
): Promise<AppStats | null> {
  const status = getDailyStudyStatus(dataset, progress, stats);
  if (!status.isComplete || status.recordedComplete) return null;
  return mergeTodayStudyComplete(stats);
}

interface AppContextValue {
  dataset: Dataset | null;
  userLibrary: UserLibrary | null;
  premadeCatalog: PremadeCatalog | null;
  isPremadeSceneKey: (key: string) => boolean;
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
  addScene: (sceneKey: string, scene: Scene) => Promise<void>;
  updateScene: (sceneKey: string, scene: Scene) => Promise<void>;
  mergeDialectTranslations: (
    translations: Record<string, SentenceDialectTranslations>
  ) => Promise<void>;
  setSceneThemeKanji: (sceneKey: string, themeKanji: string) => Promise<void>;
  appendSentenceToScene: (sceneKey: string, sentence: Sentence) => Promise<void>;
  ensureTranslated: (sentenceIds: string[]) => Promise<void>;
  translateSentenceIds: (
    sentenceIds: string[],
    options?: { onProgress?: TranslationProgressCallback; dialect?: Dialect }
  ) => Promise<{ translatedCount: number; total: number }>;
  translateAllUntranslated: (options?: {
    onProgress?: TranslationProgressCallback;
    dialect?: Dialect;
  }) => Promise<{ translatedCount: number; total: number }>;
  getUntranslatedCount: (dialect?: Dialect) => number;
  retranslateSentence: (sentenceId: string, dialect?: Dialect) => Promise<void>;
  sentenceNeedsRetranslation: (sentenceId: string, dialect?: Dialect) => boolean;
  getSentenceTranslation: (sentenceId: string, dialect: Dialect) => TranslatedFields | null;
  hasTranslationForDialect: (sentenceId: string, dialect: Dialect) => boolean;
  updateProgress: (
    sentenceId: string,
    update: Partial<SentenceProgress> | ((prev: SentenceProgress) => SentenceProgress)
  ) => Promise<void>;
  setProgress: (
    progress: UserProgress | ((prev: UserProgress) => UserProgress)
  ) => Promise<void>;
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
  const [premadeCatalog, setPremadeCatalog] = useState<PremadeCatalog | null>(null);
  const translationMutexRef = useRef(Promise.resolve());
  const progressSaveMutexRef = useRef(Promise.resolve());
  const progressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const applyLocalSnapshot = useCallback(
    async (snapshot: Awaited<ReturnType<typeof loadLocalSnapshot>>) => {
      const browseUi = readBrowseUiPreferences();
      const mergedProgress = normalizeUserProgress({
        ...snapshot.progress,
        settings: {
          ...snapshot.progress.settings,
          sceneBrowseDisplay: browseUi.sceneBrowseDisplay,
          casualPlaylistPauseMs: browseUi.casualPlaylistPauseMs,
          casualPlaylistPlaybackRate: browseUi.casualPlaylistPlaybackRate,
        },
      });

      let dataset = snapshot.dataset;
      let library = snapshot.library;

      if (sessionStatus === "authenticated" && isBrowserOnline()) {
        const shared = await fetchResolvedSharedScenes();
        dataset = mergeSharedScenesIntoDataset(dataset, shared.scenes) as Dataset | null;
        if (library && Object.keys(shared.translations).length > 0) {
          library = {
            ...library,
            sentenceTranslations: mergeSentenceTranslations(
              library.sentenceTranslations,
              shared.translations
            ),
          };
        }
      }

      setDataset(dataset);
      setUserLibrary(library);
      setPremadeCatalog(snapshot.premadeCatalog);
      progressRef.current = mergedProgress;
      setProgressState(mergedProgress);
      setStatsState(snapshot.stats);
      setLastSyncedAt(snapshot.lastSyncedAt);
      return { ...snapshot, dataset, library, progress: mergedProgress };
    },
    [sessionStatus]
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

      if (!isBrowserOnline()) {
        setSyncStatus("offline");
        setSyncStatusMessage("No internet connection");
      }

      // Online-first: pull cloud before applying local when online.
      if (!isBrowserOnline()) {
        const local = await loadLocalSnapshot();
        await applyLocalSnapshot(local);
        return;
      }

      if (canSyncToCloud()) {
        await syncFromCloud();
      }

      await pullSharedTranslationsIntoLibrary();
      const local = await loadLocalSnapshot();
      await applyLocalSnapshot(local);

      const d = await getDatasetSynced();
      let p = await getProgressSynced();
      const localAfterSync = await loadLocalSnapshot();
      await applyLocalSnapshot(localAfterSync);

      const hasStoredTranslations =
        Boolean(localAfterSync.library?.sentenceTranslations) &&
        Object.keys(localAfterSync.library!.sentenceTranslations!).length > 0;

      if (p.settings.onboardingCompleted === undefined) {
        const hasSentenceProgress = Object.keys(p.sentences).length > 0;
        const isLegacyUser =
          hasSentenceProgress ||
          hasStoredTranslations ||
          p.completedPathwayBatches.length > 0;
        p = {
          ...p,
          settings: {
            ...p.settings,
            onboardingCompleted: isLegacyUser,
            ...(isLegacyUser && !p.settings.onboardingCompletedAt
              ? { onboardingCompletedAt: new Date().toISOString() }
              : {}),
          },
        };
        await saveProgressSynced(p);
        setProgressState(normalizeUserProgress(p));
      }

      if (p.settings.placementCompleted === undefined) {
        const hasSentenceProgress = Object.keys(p.sentences).length > 0;
        const isLegacyUser =
          hasSentenceProgress ||
          hasStoredTranslations ||
          p.completedPathwayBatches.length > 0;
        if (isLegacyUser) {
          p = {
            ...p,
            settings: {
              ...p.settings,
              placementCompleted: true,
            },
          };
          await saveProgressSynced(p);
          setProgressState(normalizeUserProgress(p));
        }
      }

      if (d) {
        setDataset(d);
        setUserLibrary(localAfterSync.library);
      }

      if (d) {
        const allIds = Object.keys(p.sentences);
        const mastered = allIds.filter((id) => p.sentences[id]?.rating === 5).length;
        const weak = allIds.filter(
          (id) => p.sentences[id]?.rating !== null && (p.sentences[id]?.rating ?? 0) <= 2
        ).length;
        const total = new Set([
          ...d.main_pathway.batches.flatMap((b) => b.sentences.map((s) => s.id)),
          ...Object.values(d.scenes).flatMap((i) => i.sentences.map((s) => s.id)),
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
      // Source of truth is the session's actual unlock flag, not the state
      // machine — some transitions (e.g. stopPlaylist) move state to "ready"
      // without unlocking, which previously caused the play button to appear
      // and then silently fail back to "locked".
      setAudioUnlocked(audioSession.isUnlocked());
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

  const addScene = useCallback(
    async (sceneKey: string, scene: Scene) => {
      if (!dataset) throw new Error("No dataset loaded");
      const supabaseUserId = session?.user?.supabaseUserId;
      const displayName = session?.user?.name?.trim() || "Learner";
      const attributed = ensureSceneId({
        ...scene,
        id: scene.id ?? newSceneId(),
        createdBy:
          scene.createdBy ??
          (supabaseUserId
            ? { userId: supabaseUserId, displayName }
            : undefined),
        provenance: scene.provenance ?? {
          kind: scene.difficultyMode || scene.durationTier ? "ai" : "owned",
        },
        readOnly: false,
      });
      const next = mergeScene(dataset, sceneKey, attributed);
      await saveDatasetSynced(next);
      setDataset(next);
    },
    [dataset, session?.user?.name, session?.user?.supabaseUserId]
  );

  const updateScene = useCallback(
    async (sceneKey: string, scene: Scene) => {
      if (!dataset) throw new Error("No dataset loaded");
      const existing = dataset.scenes[sceneKey];
      if (!existing) throw new Error(`Scene "${sceneKey}" not found`);
      if (existing.readOnly || scene.readOnly) {
        throw new Error("Shared scenes are read-only — clone to edit");
      }
      const next = {
        ...dataset,
        scenes: {
          ...dataset.scenes,
          [sceneKey]: { ...existing, ...scene, readOnly: false },
        },
      };
      await saveDatasetSynced(next);
      setDataset(next);
    },
    [dataset]
  );

  const mergeDialectTranslations = useCallback(
    async (translations: Record<string, SentenceDialectTranslations>) => {
      if (Object.keys(translations).length === 0) return;
      const library = (await getUserLibrary()) ?? { scenes: {} };
      const next: UserLibrary = {
        ...library,
        sentenceTranslations: mergeSentenceTranslations(
          library.sentenceTranslations,
          translations
        ),
      };
      await saveUserLibrary(next);
      setUserLibrary(next);
      await queueLibrarySync(next);
      const composed = await getDatasetSynced();
      if (composed) setDataset(composed);
    },
    []
  );

  const setSceneThemeKanji = useCallback(
    async (sceneKey: string, themeKanji: string) => {
      if (!dataset) return;
      const next = mergeSceneThemeKanji(dataset, sceneKey, themeKanji);
      if (next === dataset) return;
      await saveDatasetSynced(next);
      setDataset(next);
    },
    [dataset]
  );

  const appendSentenceToScene = useCallback(
    async (sceneKey: string, sentence: Sentence) => {
      if (!dataset) throw new Error("No dataset loaded");
      const scene = dataset.scenes[sceneKey];
      if (scene?.readOnly) {
        throw new Error("Shared scenes are read-only — clone to edit");
      }
      const next = mergeSentenceToScene(dataset, sceneKey, sentence);
      await saveDatasetSynced(next);
      setDataset(next);
    },
    [dataset]
  );

  const getSentenceTranslation = useCallback(
    (sentenceId: string, dialect: Dialect): TranslatedFields | null => {
      return getSentenceTranslationFields(
        sentenceId,
        dialect,
        userLibrary?.sentenceTranslations
      );
    },
    [userLibrary?.sentenceTranslations]
  );

  const hasTranslationForDialectFn = useCallback(
    (sentenceId: string, dialect: Dialect): boolean =>
      Boolean(getSentenceTranslation(sentenceId, dialect)?.japanese?.trim()),
    [getSentenceTranslation]
  );

  const getUntranslatedCount = useCallback(
    (dialect?: Dialect) => {
      if (!dataset) return 0;
      const target = dialect ?? getPrimaryTranslation(progress.settings);
      return getUntranslatedIdsForDialect(
        dataset,
        userLibrary?.sentenceTranslations,
        target
      ).length;
    },
    [dataset, userLibrary?.sentenceTranslations, progress.settings]
  );

  const translateSentenceIds = useCallback(
    async (
      sentenceIds: string[],
      options?: { onProgress?: TranslationProgressCallback; dialect?: Dialect }
    ): Promise<{ translatedCount: number; total: number }> => {
      const prior = translationMutexRef.current;
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      translationMutexRef.current = prior.then(() => gate);
      await prior;

      try {
        const dialect = options?.dialect ?? getPrimaryTranslation(progress.settings);

        const current = await getDatasetSynced();
        if (!current || sentenceIds.length === 0) {
          return { translatedCount: 0, total: 0 };
        }

        const library = (await loadLocalSnapshot()).library;
        const untranslatedSet = new Set(
          getUntranslatedIdsForDialect(current, library?.sentenceTranslations, dialect)
        );
        const untranslatedIds = sentenceIds.filter((id) => untranslatedSet.has(id));
        const total = untranslatedIds.length;
        if (total === 0) {
          return { translatedCount: 0, total: 0 };
        }

        reportTranslationProgress(0, total);

        const persistBatch = async (batch: Record<string, TranslatedFields>) => {
          const updatedLibrary = await appendSentenceTranslations(batch, dialect);
          setUserLibrary(updatedLibrary);
          await queueLibrarySync(updatedLibrary);
        };

        const onProgress: TranslationProgressCallback = (completed, progressTotal) => {
          reportTranslationProgress(completed, progressTotal);
          options?.onProgress?.(completed, progressTotal);
        };

        const { translatedCount } = await translateSentences(current, untranslatedIds, {
          onProgress,
          persistBatch,
          dialect,
          sentenceTranslations: library?.sentenceTranslations,
        });

        const snapshot = await loadLocalSnapshot();
        setDataset(snapshot.dataset);
        setUserLibrary(snapshot.library);

        if (canSyncToCloud()) {
          void flushSyncQueue();
        }

        return { translatedCount, total };
      } finally {
        release();
        clearUploadProgress();
      }
    },
    [progress.settings]
  );

  const translateAllUntranslated = useCallback(
    async (options?: { onProgress?: TranslationProgressCallback; dialect?: Dialect }) => {
      const dialect = options?.dialect ?? getPrimaryTranslation(progress.settings);
      let totalTranslated = 0;
      let lastBatchTotal = 0;

      while (true) {
        const current = await getDatasetSynced();
        if (!current) break;

        const library = (await loadLocalSnapshot()).library;
        const ids = getUntranslatedIdsForDialect(
          current,
          library?.sentenceTranslations,
          dialect
        );
        if (ids.length === 0) break;

        lastBatchTotal = ids.length;

        const result = await translateSentenceIds(ids, {
          dialect,
          onProgress: (completed, total) => {
            options?.onProgress?.(totalTranslated + completed, totalTranslated + total);
          },
        });

        totalTranslated += result.translatedCount;

        if (result.translatedCount === 0) {
          break;
        }
      }

      return {
        translatedCount: totalTranslated,
        total: totalTranslated || lastBatchTotal,
      };
    },
    [translateSentenceIds, progress.settings]
  );

  const ensureTranslated = useCallback(
    async (sentenceIds: string[]) => {
      await translateSentenceIds(sentenceIds);
    },
    [translateSentenceIds]
  );

  const retranslateSentence = useCallback(
    async (sentenceId: string, dialect?: Dialect) => {
      if (!dataset) throw new Error("No dataset loaded");
      const targetDialect = dialect ?? getPrimaryTranslation(progress.settings);
      const { translatedCount } = await translateSentences(dataset, [sentenceId], {
        force: true,
        dialect: targetDialect,
        sentenceTranslations: (await loadLocalSnapshot()).library?.sentenceTranslations,
        persistBatch: async (batch) => {
          const library = await appendSentenceTranslations(batch, targetDialect);
          await queueLibrarySync(library);
        },
      });
      if (translatedCount === 0) return;

      const snapshot = await loadLocalSnapshot();
      setDataset(snapshot.dataset);
      setUserLibrary(snapshot.library);
      if (canSyncToCloud()) {
        void flushSyncQueue();
      }
    },
    [dataset, progress.settings]
  );

  const sentenceNeedsRetranslation = useCallback(
    (sentenceId: string, dialect?: Dialect) =>
      needsRetranslationForDialect(
        sentenceId,
        dialect ?? getPrimaryTranslation(progress.settings),
        userLibrary?.sentenceTranslations
      ),
    [progress.settings, userLibrary?.sentenceTranslations]
  );

  const updateProgress = useCallback(
    async (
      sentenceId: string,
      update: Partial<SentenceProgress> | ((prev: SentenceProgress) => SentenceProgress)
    ) => {
      const next = normalizeUserProgress(await updateSentenceProgressSynced(sentenceId, update));
      progressRef.current = next;
      setProgressState(next);
      const completedStats = await maybeRecordTodayStudyComplete(dataset, next, stats);
      if (completedStats) {
        await saveStatsSynced(completedStats);
        setStatsState(completedStats);
      }
    },
    [dataset, stats]
  );

  const setProgress = useCallback(
    async (p: UserProgress | ((prev: UserProgress) => UserProgress)) => {
      const prior = progressSaveMutexRef.current;
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      progressSaveMutexRef.current = prior.then(() => gate);
      await prior;

      try {
        const current = progressRef.current;
        const patch = typeof p === "function" ? p(current) : p;
        const previousPrimary = getPrimaryTranslation(current.settings);
        const nextSettings = { ...current.settings, ...patch.settings };
        const next = normalizeUserProgress(
          prepareProgressForSave({ ...current, ...patch, settings: nextSettings })
        );

        progressRef.current = next;
        setProgressState(next);
        await saveProgressSynced(next);

        const nextPrimary = getPrimaryTranslation(next.settings);
        if (nextPrimary !== previousPrimary) {
          const d = await getDatasetSynced();
          if (d) setDataset(d);
        }
      } finally {
        release();
      }
    },
    []
  );

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

  const isPremadeSceneKeyFn = useCallback(
    (key: string) => isPremadeSceneKey(key, premadeCatalog),
    [premadeCatalog]
  );

  const value = useMemo(
    () => ({
      dataset,
      userLibrary,
      premadeCatalog,
      isPremadeSceneKey: isPremadeSceneKeyFn,
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
      addScene,
      updateScene,
      mergeDialectTranslations,
      setSceneThemeKanji,
      appendSentenceToScene,
      ensureTranslated,
      translateSentenceIds,
      translateAllUntranslated,
      getUntranslatedCount,
      retranslateSentence,
      sentenceNeedsRetranslation,
      getSentenceTranslation,
      hasTranslationForDialect: hasTranslationForDialectFn,
      updateProgress,
      setProgress,
      setStats,
      audioState,
      unlockAudio,
      audioUnlocked,
    }),
    [
      dataset,
      userLibrary,
      premadeCatalog,
      isPremadeSceneKeyFn,
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
      addScene,
      updateScene,
      mergeDialectTranslations,
      setSceneThemeKanji,
      appendSentenceToScene,
      ensureTranslated,
      translateSentenceIds,
      translateAllUntranslated,
      getUntranslatedCount,
      retranslateSentence,
      sentenceNeedsRetranslation,
      getSentenceTranslation,
      hasTranslationForDialectFn,
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
