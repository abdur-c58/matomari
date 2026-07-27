import { getDB } from "@/lib/db/index";
import type { OfflineAudioAsset, OfflinePackageRecord } from "@/types/offline-audio";

export async function getOfflineAsset(
  textHash: string
): Promise<OfflineAudioAsset | null> {
  try {
    const db = await getDB();
    return (await db.get("audioAssets", textHash)) ?? null;
  } catch {
    return null;
  }
}

export async function getOfflineAssetBySentenceId(
  sentenceId: string
): Promise<OfflineAudioAsset | null> {
  try {
    const db = await getDB();
    const all = await db.getAll("audioAssets");
    return all.find((a) => a.sentenceId === sentenceId) ?? null;
  } catch {
    return null;
  }
}

export async function saveOfflineAsset(
  asset: OfflineAudioAsset,
  options?: { mergeSceneKeys?: boolean }
): Promise<void> {
  const db = await getDB();
  const merge = options?.mergeSceneKeys !== false;
  const existing = merge
    ? await db.get("audioAssets", asset.textHash)
    : null;
  const sceneKeys = Array.from(
    new Set([...(existing?.sceneKeys ?? []), ...asset.sceneKeys])
  );
  await db.put(
    "audioAssets",
    { ...asset, sceneKeys },
    asset.textHash
  );
}

export async function deleteOfflineAsset(textHash: string): Promise<void> {
  const db = await getDB();
  await db.delete("audioAssets", textHash);
}

export async function listOfflineAssets(): Promise<OfflineAudioAsset[]> {
  const db = await getDB();
  return db.getAll("audioAssets");
}

export async function getOfflinePackage(
  id: string
): Promise<OfflinePackageRecord | null> {
  try {
    const db = await getDB();
    return (await db.get("offlinePackages", id)) ?? null;
  } catch {
    return null;
  }
}

export async function saveOfflinePackage(
  record: OfflinePackageRecord
): Promise<void> {
  const db = await getDB();
  await db.put("offlinePackages", record, record.id);
}

export async function deleteOfflinePackage(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("offlinePackages", id);
}

export async function listOfflinePackages(): Promise<OfflinePackageRecord[]> {
  const db = await getDB();
  return db.getAll("offlinePackages");
}

export async function estimateOfflineStorageBytes(): Promise<number> {
  const assets = await listOfflineAssets();
  return assets.reduce((n, a) => n + (a.byteSize || a.blob.size || 0), 0);
}
