import type { Dataset } from "@/types/sentence";
import { getAllSentences } from "@/lib/validation/dataset-schema";
import { isTranslated } from "@/lib/sentence-utils";
import { getTtsText } from "@/lib/audio/tts-text";
import { setUploadProgress, clearUploadProgress } from "@/lib/upload-progress";

export type AudioSyncResult = {
  uploaded: number;
  skipped: number;
  failed: number;
  quotaExceeded: boolean;
  total: number;
};

const CONCURRENCY = 2;

async function syncOneSentence(request: {
  sentenceId: string;
  japanese: string;
  reading?: string | null;
  register?: string;
  tags?: string[];
  context_notes?: string;
  english?: string;
}): Promise<"uploaded" | "skipped" | "failed" | "quota"> {
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (response.status === 429) {
      return "quota";
    }

    if (response.status === 503) {
      return "failed";
    }

    if (!response.ok) {
      return "failed";
    }

    const cached = response.headers.get("X-Audio-Cached") === "true";
    return cached ? "skipped" : "uploaded";
  } catch {
    return "failed";
  }
}

export async function syncAudioToCloud(dataset: Dataset | null): Promise<AudioSyncResult> {
  const result: AudioSyncResult = {
    uploaded: 0,
    skipped: 0,
    failed: 0,
    quotaExceeded: false,
    total: 0,
  };

  if (!dataset) {
    return result;
  }

  const targets = [...getAllSentences(dataset).values()].filter(
    (s) => isTranslated(s) && Boolean(getTtsText(s))
  );
  result.total = targets.length;

  if (targets.length === 0) {
    return result;
  }

  let completed = 0;
  let quotaHit = false;
  let index = 0;

  const runWorker = async () => {
    while (index < targets.length && !quotaHit) {
      const current = index++;
      const sentence = targets[current];
      const japanese = sentence.japanese!.trim();

      setUploadProgress({
        active: true,
        label: `Uploading audio (${completed + 1} / ${targets.length})`,
        subtitle: "Saving TTS files to cloud storage",
        completed,
        total: targets.length,
        indeterminate: false,
      });

      const outcome = await syncOneSentence({
        sentenceId: sentence.id,
        japanese,
        reading: sentence.reading,
        register: sentence.register,
        tags: sentence.tags,
        context_notes: sentence.context_notes,
        english: sentence.english,
      });
      completed++;

      if (outcome === "uploaded") result.uploaded++;
      else if (outcome === "skipped") result.skipped++;
      else if (outcome === "quota") {
        result.quotaExceeded = true;
        quotaHit = true;
      } else result.failed++;

      setUploadProgress({
        active: true,
        label: quotaHit
          ? "ElevenLabs quota reached — audio sync paused"
          : `Uploading audio (${completed} / ${targets.length})`,
        subtitle: "Saving TTS files to cloud storage",
        completed,
        total: targets.length,
        indeterminate: false,
      });
    }
  };

  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, () => runWorker()));
  } finally {
    clearUploadProgress();
  }

  return result;
}
