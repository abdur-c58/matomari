import type { Dialect } from "@/lib/constants/dialect";
import type { AudioManifestItem } from "@/types/audio-manifest";
import {
  deleteOfflineAsset,
  deleteOfflinePackage,
  estimateOfflineStorageBytes,
  getOfflinePackage,
  listOfflineAssets,
  listOfflinePackages,
  saveOfflineAsset,
  saveOfflinePackage,
} from "@/lib/db/offline-audio-repository";
import type { DownloadProgress, OfflinePackageRecord } from "@/types/offline-audio";
import { fingerprintManifestItems } from "@/lib/offline/package-staleness";

const ALL_PACKAGE_ID = "__all__";

type ProgressListener = (progress: DownloadProgress | null) => void;

let progress: DownloadProgress | null = null;
const listeners = new Set<ProgressListener>();
const abortControllers = new Map<string, AbortController>();

function setProgress(next: DownloadProgress | null) {
  progress = next;
  listeners.forEach((l) => l(progress));
}

export function onDownloadProgress(listener: ProgressListener) {
  listeners.add(listener);
  listener(progress);
  return () => {
    listeners.delete(listener);
  };
}

export function getDownloadProgress() {
  return progress;
}

async function fetchManifest(
  sentenceIds: string[],
  dialect: Dialect
): Promise<{ items: AudioManifestItem[]; totalBytes: number }> {
  const chunks: string[][] = [];
  for (let i = 0; i < sentenceIds.length; i += 200) {
    chunks.push(sentenceIds.slice(i, i + 200));
  }

  const items: AudioManifestItem[] = [];
  let totalBytes = 0;
  for (const chunk of chunks) {
    const params = new URLSearchParams({
      sentenceIds: chunk.join(","),
      dialect,
      sign: "1",
    });
    const res = await fetch(`/api/audio/manifest?${params}`, {
      credentials: "include",
    });
    if (!res.ok) {
      throw new Error("Failed to load audio manifest");
    }
    const data = (await res.json()) as {
      items: AudioManifestItem[];
      totalBytes: number;
    };
    items.push(...(data.items ?? []));
    totalBytes += data.totalBytes ?? 0;
  }
  return { items, totalBytes };
}

async function downloadAssetBlob(
  item: AudioManifestItem,
  signal: AbortSignal
): Promise<Blob> {
  const url = item.url ?? item.streamPath;
  const res = await fetch(url, { signal, credentials: "include" });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  return res.blob();
}

async function persistPackageDownloads(input: {
  packageId: string;
  sceneKey: string | null;
  label: string;
  dialect: Dialect;
  sentenceIds: string[];
  signal: AbortController;
}): Promise<OfflinePackageRecord> {
  const { items } = await fetchManifest(input.sentenceIds, input.dialect);
  let completed = 0;
  const textHashes: string[] = [];
  let totalBytes = 0;

  setProgress({
    active: true,
    label: `Downloading ${input.label}`,
    completed: 0,
    total: items.length,
    packageId: input.packageId,
  });

  for (const item of items) {
    if (input.signal.signal.aborted) throw new Error("Download cancelled");

    const blob = await downloadAssetBlob(item, input.signal.signal);
    const sceneKeys = input.sceneKey ? [input.sceneKey] : ["__all__"];
    await saveOfflineAsset({
      textHash: item.textHash,
      sentenceId: item.sentenceId,
      dialect: item.dialect,
      speaker: item.speaker,
      byteSize: item.byteSize ?? blob.size,
      blob,
      r2Key: item.r2Key,
      createdAt: new Date().toISOString(),
      sceneKeys,
    });
    textHashes.push(item.textHash);
    totalBytes += item.byteSize ?? blob.size;
    completed++;
    setProgress({
      active: true,
      label: `Downloading ${input.label}`,
      completed,
      total: items.length,
      packageId: input.packageId,
    });
  }

  const record: OfflinePackageRecord = {
    id: input.packageId,
    sceneKey: input.sceneKey,
    label: input.label,
    dialect: input.dialect,
    textHashes,
    manifestFingerprint: fingerprintManifestItems(items),
    totalBytes,
    status: items.length === 0 ? "error" : "ready",
    updatedAt: new Date().toISOString(),
    lastError:
      items.length === 0
        ? "No ready audio assets yet — wait for cloud generation"
        : undefined,
  };
  await saveOfflinePackage(record);
  return record;
}

export async function downloadScenePackage(input: {
  sceneKey: string;
  label: string;
  sentenceIds: string[];
  dialect: Dialect;
}): Promise<OfflinePackageRecord> {
  const existing = abortControllers.get(input.sceneKey);
  existing?.abort();
  const controller = new AbortController();
  abortControllers.set(input.sceneKey, controller);

  try {
    if (typeof navigator !== "undefined" && "storage" in navigator) {
      try {
        await navigator.storage.persist?.();
      } catch {
        // ignore
      }
    }

    return await persistPackageDownloads({
      packageId: input.sceneKey,
      sceneKey: input.sceneKey,
      label: input.label,
      dialect: input.dialect,
      sentenceIds: input.sentenceIds,
      signal: controller,
    });
  } finally {
    abortControllers.delete(input.sceneKey);
    setProgress(null);
  }
}

export async function downloadAllPackages(input: {
  sentenceIds: string[];
  dialect: Dialect;
  label?: string;
}): Promise<OfflinePackageRecord> {
  const existing = abortControllers.get(ALL_PACKAGE_ID);
  existing?.abort();
  const controller = new AbortController();
  abortControllers.set(ALL_PACKAGE_ID, controller);

  try {
    if (typeof navigator !== "undefined" && "storage" in navigator) {
      try {
        await navigator.storage.persist?.();
      } catch {
        // ignore
      }
    }

    return await persistPackageDownloads({
      packageId: ALL_PACKAGE_ID,
      sceneKey: null,
      label: input.label ?? "All audio",
      dialect: input.dialect,
      sentenceIds: input.sentenceIds,
      signal: controller,
    });
  } finally {
    abortControllers.delete(ALL_PACKAGE_ID);
    setProgress(null);
  }
}

export function cancelDownload(packageId: string) {
  abortControllers.get(packageId)?.abort();
}

export async function removeScenePackage(sceneKey: string): Promise<void> {
  const pkg = await getOfflinePackage(sceneKey);
  if (!pkg) return;

  const assets = await listOfflineAssets();
  for (const hash of pkg.textHashes) {
    const asset = assets.find((a) => a.textHash === hash);
    if (!asset) continue;
    const remaining = asset.sceneKeys.filter((k) => k !== sceneKey);
    if (remaining.length === 0) {
      // Keep if referenced by __all__ package
      const allPkg = await getOfflinePackage(ALL_PACKAGE_ID);
      if (allPkg?.textHashes.includes(hash)) {
        await saveOfflineAsset(
          { ...asset, sceneKeys: ["__all__"] },
          { mergeSceneKeys: false }
        );
      } else {
        await deleteOfflineAsset(hash);
      }
    } else {
      await saveOfflineAsset(
        { ...asset, sceneKeys: remaining },
        { mergeSceneKeys: false }
      );
    }
  }

  await deleteOfflinePackage(sceneKey);
}

export async function removeAllPackages(): Promise<void> {
  const packages = await listOfflinePackages();
  for (const pkg of packages) {
    await deleteOfflinePackage(pkg.id);
  }
  const assets = await listOfflineAssets();
  for (const asset of assets) {
    await deleteOfflineAsset(asset.textHash);
  }
}

export async function getOfflineInventory() {
  const [packages, bytes] = await Promise.all([
    listOfflinePackages(),
    estimateOfflineStorageBytes(),
  ]);
  return { packages, totalBytes: bytes };
}

export async function isSceneDownloaded(sceneKey: string): Promise<boolean> {
  const pkg = await getOfflinePackage(sceneKey);
  return (
    !!pkg &&
    (pkg.status === "ready" || pkg.status === "stale") &&
    pkg.textHashes.length > 0
  );
}

export async function isSceneDownloadStale(
  sceneKey: string,
  sentenceIds: string[],
  dialect: Dialect
): Promise<boolean> {
  const pkg = await getOfflinePackage(sceneKey);
  if (!pkg?.manifestFingerprint || sentenceIds.length === 0) return false;
  const { fetchManifestFingerprint } = await import(
    "@/lib/offline/package-staleness"
  );
  const current = await fetchManifestFingerprint(sentenceIds, dialect);
  return !!current && current !== pkg.manifestFingerprint;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
