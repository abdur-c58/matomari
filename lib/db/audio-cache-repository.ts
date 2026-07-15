import type { AudioCacheEntry } from "@/types/audio";
import { getDB } from "./index";

export async function getCachedAudio(
  sentenceId: string
): Promise<AudioCacheEntry | null> {
  try {
    const db = await getDB();
    return (await db.get("audioCache", sentenceId)) ?? null;
  } catch {
    return null;
  }
}

export async function getCachedAudioByTextHash(
  textHash: string
): Promise<AudioCacheEntry | null> {
  try {
    const db = await getDB();
    const entries = await db.getAll("audioCache");
    return entries.find((entry) => entry.textHash === textHash) ?? null;
  } catch {
    return null;
  }
}

export async function saveCachedAudio(entry: AudioCacheEntry): Promise<void> {
  const db = await getDB();
  await db.put("audioCache", entry, entry.sentenceId);
}

export async function deleteCachedAudio(sentenceId: string): Promise<void> {
  const db = await getDB();
  await db.delete("audioCache", sentenceId);
}
