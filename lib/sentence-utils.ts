import {
  legacyFishDirectivesToTags,
  parseNarrationAudioDirectives,
  sanitizeParalinguisticTags,
} from "@/lib/audio/fish-audio-cues";
import { normalizeLegacyUnderscores } from "@/lib/sentence/placeholders";
import type { Register, SeedSentence, Sentence, SentencePlaceholder, TranslatedFields } from "@/types/sentence";

export function isTranslated(s: Sentence): boolean {
  if (s.translated === true) return true;
  return Boolean(s.japanese?.trim());
}

export function needsTranslation(s: Sentence): boolean {
  return !isTranslated(s);
}

export function toSeedPayload(s: Sentence): SeedSentence {
  return {
    id: s.id,
    english: s.english,
    register: s.register,
    difficulty: s.difficulty,
    category: s.category,
    subtopic: s.subtopic,
    tags: s.tags,
    context_notes: s.context_notes,
    translated: s.translated,
    ...(s.speaker ? { speaker: s.speaker } : {}),
    ...(s.paralinguisticTags?.length
      ? { paralinguisticTags: s.paralinguisticTags }
      : {}),
    ...(s.narrationAudio ? { narrationAudio: s.narrationAudio } : {}),
  };
}

function parseDifficulty(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string" && raw.trim().toLowerCase() === "mixed") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function normalizeLegacySentence(raw: unknown): Sentence {
  const s = raw as Record<string, unknown>;
  const japanese = typeof s.japanese === "string" ? s.japanese : undefined;
  const hasJapanese = Boolean(japanese?.trim());

  const contextNotes =
    typeof s.context_notes === "string"
      ? s.context_notes
      : typeof s.notes === "string"
        ? s.notes
        : undefined;

  const difficultyRaw = parseDifficulty(s.difficulty);
  // Legacy rows without difficulty default to 1; explicit null/"mixed" stays null.
  const difficulty =
    s.difficulty === null ||
    (typeof s.difficulty === "string" && s.difficulty.trim().toLowerCase() === "mixed")
      ? null
      : difficultyRaw ?? 1;

  const sentence: Sentence = {
    id: String(s.id ?? ""),
    english: String(s.english ?? ""),
    register: (s.register as Register) ?? "polite",
    difficulty,
    category: String(s.category ?? ""),
    subtopic: String(s.subtopic ?? ""),
    tags: Array.isArray(s.tags) ? s.tags.map(String) : [],
    context_notes: contextNotes,
    translated: s.translated === true || hasJapanese,
  };

  if (s.speaker === "A" || s.speaker === "B") {
    sentence.speaker = s.speaker;
  }

  const narrationAudio = parseNarrationAudioDirectives(s.narrationAudio);
  if (narrationAudio) {
    sentence.narrationAudio = {
      pauseAfterMs: narrationAudio.pauseAfterMs,
      ...(narrationAudio.fishAudio ? { fishAudio: narrationAudio.fishAudio } : {}),
    };
  }

  const directTags = sanitizeParalinguisticTags(s.paralinguisticTags);
  const legacyTags =
    narrationAudio?.paralinguisticTags ??
    legacyFishDirectivesToTags(narrationAudio?.fishAudio);
  const paralinguisticTags = directTags ?? legacyTags;
  if (paralinguisticTags) {
    sentence.paralinguisticTags = paralinguisticTags;
  }

  // Seed/catalog may attach placeholders before japanese exists (e.g. [name] English).
  if (Array.isArray(s.placeholders)) {
    sentence.placeholders = s.placeholders as SentencePlaceholder[];
  }

  if (hasJapanese) {
    sentence.japanese = japanese!;
    sentence.reading = typeof s.reading === "string" ? s.reading : japanese!;
    sentence.romaji = typeof s.romaji === "string" ? s.romaji : "";
    const literalNote =
      typeof s.literal_note === "string"
        ? s.literal_note
        : undefined;
    if (literalNote) sentence.literal_note = literalNote;
    if (typeof s.phonetic_reading === "string") {
      sentence.phonetic_reading = s.phonetic_reading;
    }
  }

  return normalizeLegacyUnderscores(sentence);
}

export function applyTranslation(
  sentence: Sentence,
  fields: TranslatedFields
): Sentence {
  return {
    ...sentence,
    ...fields,
    translated: true,
  };
}

export function fieldsFromComposedSentence(sentence: Sentence): TranslatedFields | null {
  if (!sentence.japanese?.trim()) return null;
  return {
    japanese: sentence.japanese,
    reading: sentence.reading ?? sentence.japanese,
    romaji: sentence.romaji ?? "",
    literal_note: sentence.literal_note,
    phonetic_reading: sentence.phonetic_reading,
    placeholders: sentence.placeholders,
  };
}

export function normalizeEnglish(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Effective numeric difficulty for consumers that cannot handle null (default 3). */
export function effectiveDifficulty(difficulty: number | null | undefined): number {
  if (difficulty == null || !Number.isFinite(difficulty)) return 3;
  return difficulty;
}

export function isMixedDifficulty(difficulty: number | null | undefined): boolean {
  return difficulty == null;
}
