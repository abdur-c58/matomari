import type { Dataset, UserLibrary } from "@/types/sentence";
import type { UserProgress } from "@/types/progress";
import { getPrimaryTranslation } from "@/lib/preferences/translation-preferences";
import type { AppStats } from "@/types/stats";
import type { SyncTable } from "@/lib/repositories/types";
import {
  getUserLibrary,
  saveUserLibrary,
  getComposedDataset,
  saveDataset,
  appendSentenceTranslations,
} from "@/lib/db/dataset-repository";
import {
  extractUserLibrary,
  isLegacyFullDataset,
  normalizeStoredLibrary,
  resolveComposedDataset,
} from "@/lib/services/shared-pathway-service";
import {
  getProgress,
  saveProgress,
  updateSentenceProgress,
  bulkUpdateProgress,
} from "@/lib/db/progress-repository";
import {
  getStats,
  saveStats,
  recordActiveDay,
  startModeSession,
  endModeSession,
  recordDailySnapshot,
  recordMastery,
} from "@/lib/db/stats-repository";
import {
  enqueueSyncLatest,
  getPendingSync,
  removeSyncItem,
  incrementSyncRetry,
  getMeta,
  setMeta,
} from "@/lib/db/sync-queue-repository";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { formatDateKey } from "@/lib/utils";
import {
  clearUploadProgress,
  labelForSyncTable,
  setUploadProgress,
  subtitleForSyncTable,
} from "@/lib/upload-progress";
import {
  fetchCloudSession,
  pullRemoteSnapshot,
  pushRemoteItems,
} from "@/lib/sync/cloud-api";
import { syncAudioToCloud, type AudioSyncResult } from "@/lib/sync/audio-sync";

export type SyncStatus = "idle" | "syncing" | "offline" | "error";

export type ManualSyncResult = {
  ok: boolean;
  supabaseOk: boolean;
  message?: string;
  audio: AudioSyncResult;
};

let syncStatus: SyncStatus = "idle";
let syncStatusMessage: string | null = null;
let statusListeners: ((s: SyncStatus) => void)[] = [];
let messageListeners: ((message: string | null) => void)[] = [];

export function onSyncStatusChange(listener: (s: SyncStatus) => void) {
  statusListeners.push(listener);
  listener(syncStatus);
  return () => {
    statusListeners = statusListeners.filter((l) => l !== listener);
  };
}

export function onSyncStatusMessageChange(listener: (message: string | null) => void) {
  messageListeners.push(listener);
  listener(syncStatusMessage);
  return () => {
    messageListeners = messageListeners.filter((l) => l !== listener);
  };
}

function setSyncStatus(s: SyncStatus, message?: string | null) {
  syncStatus = s;
  if (message !== undefined) {
    syncStatusMessage = message;
    messageListeners.forEach((l) => l(syncStatusMessage));
  }
  statusListeners.forEach((l) => l(s));
}

export function getSyncStatus() {
  return syncStatus;
}

export function getSyncStatusMessage() {
  return syncStatusMessage;
}

export function isBrowserOnline() {
  return typeof navigator === "undefined" || navigator.onLine;
}

export function canSyncToCloud() {
  return isSupabaseConfigured() && isBrowserOnline();
}

async function queuePush(table: SyncTable, payload: unknown) {
  await enqueueSyncLatest({
    table,
    payload,
    createdAt: new Date().toISOString(),
  });
}

/** Persist library locally and queue cloud sync without uploading yet. */
export async function queueLibrarySync(library: UserLibrary): Promise<void> {
  const now = new Date().toISOString();
  await setMeta("datasetUpdatedAt", now);
  await queuePush("user_datasets", library);
}

function normalizeRemoteLibrary(payload: unknown): UserLibrary {
  const library = normalizeStoredLibrary(payload);
  if (library) return library;
  if (isLegacyFullDataset(payload)) {
    return extractUserLibrary(payload);
  }
  return { islands: {} };
}

export async function loadLocalSnapshot() {
  const [library, progress, stats, lastSyncedAt] = await Promise.all([
    getUserLibrary(),
    getProgress(),
    getStats(),
    getMeta("lastSyncedAt"),
  ]);
  const dataset = await getComposedDataset();
  return { dataset, library, progress, stats, lastSyncedAt };
}

/** Force-queue the latest local dataset, progress, and stats for cloud upload. */
export async function enqueueLocalSnapshot(): Promise<boolean> {
  const [library, progress, stats] = await Promise.all([
    getUserLibrary(),
    getProgress(),
    getStats(),
  ]);

  const now = new Date().toISOString();

  if (library) {
    await setMeta("datasetUpdatedAt", now);
    await queuePush("user_datasets", library);
  }

  await setMeta("progressUpdatedAt", now);
  await queuePush("user_progress", progress);

  await setMeta("statsUpdatedAt", now);
  await queuePush("user_stats", stats);

  return Boolean(library);
}

async function requireCloudSession() {
  const session = await fetchCloudSession();

  if (!session.supabaseConfigured) {
    return { ok: false as const, message: "Supabase is not configured on the server" };
  }

  if (!session.authenticated) {
    return {
      ok: false as const,
      message: "Sign in with Google to sync to the cloud",
    };
  }

  if (session.tablesReady === false && session.tablesError) {
    return { ok: false as const, message: session.tablesError };
  }

  return { ok: true as const, session };
}

export async function flushSyncQueue(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  if (!isBrowserOnline()) {
    setSyncStatus("offline", "No internet connection");
    return false;
  }

  const cloud = await requireCloudSession();
  if (!cloud.ok) {
    setSyncStatus("offline", cloud.message);
    return false;
  }

  const pending = await getPendingSync();
  if (pending.length === 0) {
    setSyncStatus("idle", null);
    return true;
  }

  setSyncStatus("syncing");
  let hadFailure = false;

  try {
    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      const isSingleBlob = pending.length === 1 && item.table === "user_datasets";

      setUploadProgress({
        active: true,
        label: labelForSyncTable(item.table, item.payload),
        subtitle: subtitleForSyncTable(item.table, item.payload),
        completed: isSingleBlob ? 0 : i,
        total: isSingleBlob ? 0 : pending.length,
        indeterminate: isSingleBlob,
      });

      const { ok, error } = await pushRemoteItems([
        { table: item.table, payload: item.payload },
      ]);

      if (ok) {
        await removeSyncItem(item.id);
        if (!isSingleBlob) {
          setUploadProgress({
            active: true,
            label: labelForSyncTable(item.table, item.payload),
            subtitle: subtitleForSyncTable(item.table, item.payload),
            completed: i + 1,
            total: pending.length,
            indeterminate: false,
          });
        }
      } else {
        hadFailure = true;
        await incrementSyncRetry(item.id);
        if (error?.includes("Could not find the table")) {
          setSyncStatus(
            "error",
            "Database tables missing — run supabase/migrations/001_initial.sql in Supabase SQL Editor"
          );
          return false;
        }
      }
    }

    if (!hadFailure) {
      await setMeta("lastSyncedAt", new Date().toISOString());
      setSyncStatus("idle", null);
      return true;
    }

    setSyncStatus(
      "error",
      "Could not save data to Supabase — check Settings for details"
    );
    return false;
  } catch {
    setSyncStatus("error");
    return false;
  } finally {
    clearUploadProgress();
  }
}

export async function pullRemoteIfNewer(): Promise<boolean> {
  if (!canSyncToCloud()) return false;

  const cloud = await requireCloudSession();
  if (!cloud.ok) return false;

  const remote = await pullRemoteSnapshot({
    datasetUpdatedAt: await getMeta("datasetUpdatedAt"),
    progressUpdatedAt: await getMeta("progressUpdatedAt"),
    statsUpdatedAt: await getMeta("statsUpdatedAt"),
  });
  if (!remote) return false;

  let changed = false;

  if (remote.dataset) {
    const localUpdated = await getMeta("datasetUpdatedAt");
    if (!localUpdated || remote.dataset.updatedAt > localUpdated) {
      await saveUserLibrary(normalizeRemoteLibrary(remote.dataset.data));
      await setMeta("datasetUpdatedAt", remote.dataset.updatedAt);
      changed = true;
    }
  }

  if (remote.progress) {
    const localUpdated = await getMeta("progressUpdatedAt");
    if (!localUpdated || remote.progress.updatedAt > localUpdated) {
      await saveProgress(remote.progress.data);
      await setMeta("progressUpdatedAt", remote.progress.updatedAt);
      changed = true;
    }
  }

  if (remote.stats) {
    const localUpdated = await getMeta("statsUpdatedAt");
    if (!localUpdated || remote.stats.updatedAt > localUpdated) {
      await saveStats(remote.stats.data);
      await setMeta("statsUpdatedAt", remote.stats.updatedAt);
      changed = true;
    }
  }

  return changed;
}

/** Push local changes, then pull remote updates if newer. */
export async function syncAll(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  if (!isBrowserOnline()) {
    setSyncStatus("offline", "No internet connection");
    return false;
  }

  await flushSyncQueue();
  await pullRemoteIfNewer();
  await flushSyncQueue();
  return getSyncStatus() === "idle";
}

/** Full manual sync: push local state, pull remote, upload missing audio to R2. */
export async function manualSync(): Promise<ManualSyncResult> {
  const emptyAudio: AudioSyncResult = {
    uploaded: 0,
    skipped: 0,
    failed: 0,
    quotaExceeded: false,
    total: 0,
  };

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      supabaseOk: false,
      message: "Supabase is not configured",
      audio: emptyAudio,
    };
  }

  if (!isBrowserOnline()) {
    setSyncStatus("offline", "No internet connection");
    return {
      ok: false,
      supabaseOk: false,
      message: "No internet connection",
      audio: emptyAudio,
    };
  }

  const cloud = await requireCloudSession();
  if (!cloud.ok) {
    setSyncStatus("offline", cloud.message);
    return {
      ok: false,
      supabaseOk: false,
      message: cloud.message,
      audio: emptyAudio,
    };
  }

  setSyncStatus("syncing", "Syncing library to cloud…");

  const hasLibrary = await enqueueLocalSnapshot();
  const supabaseOk = await syncAll();

  const snapshot = await loadLocalSnapshot();
  const audio = snapshot.dataset
    ? await syncAudioToCloud(
        snapshot.dataset,
        getPrimaryTranslation(snapshot.progress.settings)
      )
    : emptyAudio;

  if (supabaseOk) {
    await setMeta("lastSyncedAt", new Date().toISOString());
    setSyncStatus("idle", null);
  }

  const ok = supabaseOk && !audio.quotaExceeded && audio.failed === 0;

  let message: string | undefined;
  if (!supabaseOk) {
    message = getSyncStatusMessage() ?? "Could not sync to Supabase";
  } else if (audio.quotaExceeded) {
    message = "Library synced. TTS credits exhausted — audio sync paused; tap Sync again later.";
  } else if (audio.failed > 0) {
    message = "Library synced. Some audio files could not be uploaded.";
  }

  return { ok, supabaseOk, message, audio };
}

async function persistWithSync(
  table: SyncTable,
  saveLocal: () => Promise<void>,
  metaKey: string,
  payload: unknown
): Promise<void> {
  const now = new Date().toISOString();
  await saveLocal();
  await setMeta(metaKey, now);
  await queuePush(table, payload);

  if (canSyncToCloud()) {
    await flushSyncQueue();
  } else if (isSupabaseConfigured()) {
    setSyncStatus("offline", "No internet connection");
  }
}

export async function getDatasetSynced(): Promise<Dataset | null> {
  return getComposedDataset();
}

export async function saveDatasetSynced(
  data: Dataset,
  options?: { skipFlush?: boolean }
): Promise<void> {
  await saveDataset(data);
  const library = await getUserLibrary();
  if (!library) return;

  await queueLibrarySync(library);

  if (options?.skipFlush) {
    if (isSupabaseConfigured() && !canSyncToCloud()) {
      setSyncStatus("offline", "No internet connection");
    }
    return;
  }

  if (canSyncToCloud()) {
    await flushSyncQueue();
  } else if (isSupabaseConfigured()) {
    setSyncStatus("offline", "No internet connection");
  }
}

export async function getProgressSynced(): Promise<UserProgress> {
  return getProgress();
}

export async function saveProgressSynced(progress: UserProgress): Promise<void> {
  await persistWithSync(
    "user_progress",
    () => saveProgress(progress),
    "progressUpdatedAt",
    progress
  );
}

export async function updateSentenceProgressSynced(
  sentenceId: string,
  update: Parameters<typeof updateSentenceProgress>[1]
): Promise<UserProgress> {
  const next = await updateSentenceProgress(sentenceId, update);
  await saveProgressSynced(next);
  return next;
}

export async function bulkUpdateProgressSynced(
  updater: Parameters<typeof bulkUpdateProgress>[0]
): Promise<UserProgress> {
  const next = await bulkUpdateProgress(updater);
  await saveProgressSynced(next);
  return next;
}

export async function getStatsSynced(): Promise<AppStats> {
  return getStats();
}

export async function saveStatsSynced(stats: AppStats): Promise<void> {
  await persistWithSync(
    "user_stats",
    () => saveStats(stats),
    "statsUpdatedAt",
    stats
  );
}

export async function recordDailySnapshotSynced(
  snapshot: Parameters<typeof recordDailySnapshot>[0]
): Promise<void> {
  const today = formatDateKey();
  const lastSnapshot = await getMeta("lastSnapshotDate");
  if (lastSnapshot === today) return;

  await recordDailySnapshot(snapshot);
  await setMeta("lastSnapshotDate", today);
  const stats = await getStats();
  await saveStatsSynced(stats);
}

export {
  recordActiveDay,
  startModeSession,
  endModeSession,
  recordMastery,
};
