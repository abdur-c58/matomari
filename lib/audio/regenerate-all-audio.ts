import type { Dataset } from "@/types/sentence";
import { getAllSentences } from "@/lib/validation/dataset-schema";
import { isTranslated } from "@/lib/sentence-utils";
import { getSpokenScript } from "@/lib/audio/tts-text";
import { generateServerAudio } from "@/lib/audio/generate-audio";
import { TtsQuotaError } from "@/lib/audio/tts-errors";
import { isFishAudioConfigured, isR2Configured } from "@/lib/env";
import {
  deleteAllR2Audio,
  deleteR2Object,
} from "@/lib/storage/r2-client";
import {
  deleteAllAudioMetadata,
  listAudioMetadata,
  upsertAudioMetadata,
} from "@/lib/supabase/server-data";
import { rm } from "fs/promises";
import path from "path";

export type RegenerateAudioResult = {
  total: number;
  generated: number;
  failed: number;
  deletedR2: number;
  quotaExceeded: boolean;
  errors: string[];
};

const FS_CACHE_DIR = path.join(process.cwd(), "data", "audio-cache");

export async function clearAudioCaches(): Promise<{ deletedR2: number }> {
  let deletedR2 = 0;

  const metadata = await listAudioMetadata();
  if (isR2Configured()) {
    for (const row of metadata) {
      await deleteR2Object(row.r2_key);
    }
    deletedR2 = await deleteAllR2Audio();
  }

  await deleteAllAudioMetadata();

  try {
    await rm(FS_CACHE_DIR, { recursive: true, force: true });
  } catch {
    // no local cache dir
  }

  return { deletedR2 };
}

export async function regenerateAllAudio(
  dataset: Dataset,
  onProgress?: (completed: number, total: number, label: string) => void
): Promise<RegenerateAudioResult> {
  const result: RegenerateAudioResult = {
    total: 0,
    generated: 0,
    failed: 0,
    deletedR2: 0,
    quotaExceeded: false,
    errors: [],
  };

  if (!isFishAudioConfigured()) {
    result.errors.push("FISH_AUDIO_API_KEY is not configured");
    return result;
  }

  if (!isR2Configured()) {
    result.errors.push("R2 is not configured");
    return result;
  }

  const targets = [...getAllSentences(dataset).values()].filter(
    (s) => isTranslated(s) && Boolean(getSpokenScript(s))
  );
  result.total = targets.length;

  if (targets.length === 0) {
    return result;
  }

  const { deletedR2 } = await clearAudioCaches();
  result.deletedR2 = deletedR2;

  for (let i = 0; i < targets.length; i++) {
    const sentence = targets[i];
    const spokenText = getSpokenScript(sentence)!;

    onProgress?.(i, targets.length, sentence.id);

    try {
      const { hash, r2Key } = await generateServerAudio(
        spokenText,
        sentence.id,
        { force: true, speaker: sentence.speaker === "B" ? "B" : "A" }
      );
      await upsertAudioMetadata(hash, sentence.id, r2Key);
      result.generated++;
    } catch (e) {
      if (e instanceof TtsQuotaError) {
        result.quotaExceeded = true;
        result.errors.push(`Quota exceeded at ${sentence.id}`);
        break;
      }
      result.failed++;
      result.errors.push(
        `${sentence.id}: ${e instanceof Error ? e.message : "Unknown error"}`
      );
    }

    onProgress?.(i + 1, targets.length, sentence.id);
  }

  return result;
}
