import type { TtsRequest } from "@/lib/audio/audio-session";
import type { Dialect } from "@/lib/constants/dialect";
import type {
  Dataset,
  Sentence,
  SentenceDialectTranslations,
} from "@/types/sentence";
import type { UserProgress } from "@/types/progress";
import { getPrimaryTranslation } from "@/lib/preferences/translation-preferences";
import { getSentenceTranslationFields } from "@/lib/services/dialect-translation-service";
import {
  getSentencesForStudyUnit,
  type StudyUnitRef,
} from "@/lib/services/study-unit-service";

export function sentenceToTtsRequest(
  sentence: Sentence,
  dialect: Dialect,
  translations?: Record<string, SentenceDialectTranslations>
): TtsRequest | null {
  const fields = getSentenceTranslationFields(
    sentence.id,
    dialect,
    translations,
    sentence
  );
  if (!fields?.japanese?.trim()) return null;

  return {
    sentenceId: sentence.id,
    japanese: fields.japanese,
    reading: fields.reading,
    phonetic_reading: fields.phonetic_reading,
    placeholders: fields.placeholders ?? sentence.placeholders,
    dialect,
    speaker: sentence.speaker === "B" ? "B" : "A",
    register: sentence.register,
    tags: sentence.tags,
    context_notes: sentence.context_notes,
    english: sentence.english,
    ...(sentence.paralinguisticTags?.length
      ? { paralinguisticTags: sentence.paralinguisticTags }
      : {}),
    ...(sentence.narrationAudio ? { cacheBySpokenScript: true } : {}),
    ...(sentence.narrationAudio?.fishAudio
      ? { fishAudio: sentence.narrationAudio.fishAudio }
      : {}),
    ...(typeof sentence.narrationAudio?.pauseAfterMs === "number"
      ? { pauseAfterMs: sentence.narrationAudio.pauseAfterMs }
      : {}),
  };
}

export function buildPlaylistFromSentences(
  sentences: Sentence[],
  progress: UserProgress,
  options?: {
    dialect?: Dialect;
    translations?: Record<string, SentenceDialectTranslations>;
  }
): { playlist: TtsRequest[]; skipped: number } {
  const dialect = options?.dialect ?? getPrimaryTranslation(progress.settings);
  const translations = options?.translations;
  const playlist: TtsRequest[] = [];
  let skipped = 0;

  for (const sentence of sentences) {
    const item = sentenceToTtsRequest(sentence, dialect, translations);
    if (item) playlist.push(item);
    else skipped++;
  }

  return { playlist, skipped };
}

export function buildPlaylistFromUnits(
  dataset: Dataset,
  progress: UserProgress,
  refs: StudyUnitRef[],
  options?: {
    pathwayBatchNumber?: number | null;
    dialect?: Dialect;
    translations?: Record<string, SentenceDialectTranslations>;
  }
): { playlist: TtsRequest[]; skipped: number } {
  const sentences: Sentence[] = [];

  for (const ref of refs) {
    const batchNumber =
      ref.kind === "pathway" ? (options?.pathwayBatchNumber ?? null) : null;
    sentences.push(...getSentencesForStudyUnit(dataset, ref, batchNumber));
  }

  const seen = new Set<string>();
  const unique = sentences.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  return buildPlaylistFromSentences(unique, progress, {
    dialect: options?.dialect,
    translations: options?.translations,
  });
}
