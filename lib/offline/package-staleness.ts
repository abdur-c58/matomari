import { createHash } from "crypto";
import type { Dialect } from "@/lib/constants/dialect";
import type { AudioManifestItem } from "@/types/audio-manifest";
import type { OfflinePackageRecord } from "@/types/offline-audio";

export function fingerprintManifestItems(items: AudioManifestItem[]): string {
  const hashes = items
    .map((item) => item.textHash)
    .filter(Boolean)
    .sort();
  return createHash("sha256").update(hashes.join("|")).digest("hex");
}

export function isOfflinePackageStale(
  pkg: OfflinePackageRecord,
  currentItems: AudioManifestItem[]
): boolean {
  if (!pkg.manifestFingerprint) return false;
  const current = fingerprintManifestItems(currentItems);
  return current !== pkg.manifestFingerprint;
}

export async function fetchManifestFingerprint(
  sentenceIds: string[],
  dialect: Dialect
): Promise<string | null> {
  if (sentenceIds.length === 0) return null;
  const params = new URLSearchParams({
    sentenceIds: sentenceIds.slice(0, 200).join(","),
    dialect,
    sign: "0",
  });
  const res = await fetch(`/api/audio/manifest?${params}`, {
    credentials: "include",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { items?: AudioManifestItem[] };
  return fingerprintManifestItems(data.items ?? []);
}
