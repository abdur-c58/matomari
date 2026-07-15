import type { Dataset, Sentence } from "@/types/sentence";
import { getAllSentences } from "@/lib/validation/dataset-schema";
import { isTranslated } from "@/lib/sentence-utils";
import { getSpokenScript } from "@/lib/audio/tts-text";
import type { FishAudioDirectives } from "@/lib/audio/fish-audio-cues";
import type { Dialect } from "@/lib/constants/dialect";
import type { NarrationSpeaker, SentencePlaceholder } from "@/types/sentence";
import { setUploadProgress, clearUploadProgress } from "@/lib/upload-progress";

export type AudioSyncResult = {
  uploaded: number;
  skipped: number;
  failed: number;
  quotaExceeded: boolean;
  total: number;
  /** First failure detail (status/body) for debugging mass upload failures. */
  firstError?: string;
};

const CONCURRENCY = 2;

function spokenFieldsFromSentence(sentence: Sentence) {
  return {
    japanese: sentence.japanese,
    reading: sentence.reading,
    phonetic_reading: sentence.phonetic_reading,
    placeholders: sentence.placeholders,
    register: sentence.register,
    tags: sentence.tags,
    context_notes: sentence.context_notes,
    english: sentence.english,
    fishAudio: sentence.narrationAudio?.fishAudio,
  };
}

async function syncOneSentence(request: {
  sentenceId: string;
  japanese: string;
  reading?: string | null;
  phonetic_reading?: string | null;
  placeholders?: SentencePlaceholder[];
  dialect?: Dialect;
  speaker?: NarrationSpeaker;
  register?: string;
  tags?: string[];
  context_notes?: string;
  english?: string;
  fishAudio?: FishAudioDirectives;
}): Promise<{ outcome: "uploaded" | "skipped" | "failed" | "quota"; error?: string }> {
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (response.status === 429) {
      return { outcome: "quota" };
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        outcome: "failed",
        error: `${response.status} ${body.slice(0, 180)}`.trim(),
      };
    }

    const cached = response.headers.get("X-Audio-Cached") === "true";
    return { outcome: cached ? "skipped" : "uploaded" };
  } catch (e) {
    return {
      outcome: "failed",
      error: e instanceof Error ? e.message : "network error",
    };
  }
}

export async function syncAudioToCloud(
  dataset: Dataset | null,
  dialect: Dialect = "standard"
): Promise<AudioSyncResult> {
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

  const targets = [...getAllSentences(dataset).values()].filter((s) => {
    if (!isTranslated(s)) return false;
    return Boolean(
      getSpokenScript(spokenFieldsFromSentence(s), { dialect })
    );
  });
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
        label: `Uploading TTS (${completed + 1} / ${targets.length})`,
        subtitle: "Saving TTS files to cloud storage",
        completed,
        total: targets.length,
        indeterminate: false,
      });

      const { outcome, error } = await syncOneSentence({
        sentenceId: sentence.id,
        japanese,
        reading: sentence.reading,
        phonetic_reading: sentence.phonetic_reading,
        placeholders: sentence.placeholders,
        dialect,
        speaker: sentence.speaker === "B" ? "B" : "A",
        register: sentence.register,
        tags: sentence.tags,
        context_notes: sentence.context_notes,
        english: sentence.english,
        ...(sentence.narrationAudio?.fishAudio
          ? { fishAudio: sentence.narrationAudio.fishAudio }
          : {}),
      });
      completed++;

      if (outcome === "uploaded") result.uploaded++;
      else if (outcome === "skipped") result.skipped++;
      else if (outcome === "quota") {
        result.quotaExceeded = true;
        quotaHit = true;
      } else {
        result.failed++;
        if (!result.firstError && error) {
          result.firstError = error;
        }
      }

      setUploadProgress({
        active: true,
        label: quotaHit
          ? "TTS credits exhausted — upload paused"
          : `Uploading TTS (${completed} / ${targets.length})`,
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
