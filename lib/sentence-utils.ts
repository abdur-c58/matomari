import type { Register, SeedSentence, Sentence, TranslatedFields } from "@/types/sentence";

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
  };
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

  const sentence: Sentence = {
    id: String(s.id ?? ""),
    english: String(s.english ?? ""),
    register: (s.register as Register) ?? "polite",
    difficulty: Number(s.difficulty ?? 1),
    category: String(s.category ?? ""),
    subtopic: String(s.subtopic ?? ""),
    tags: Array.isArray(s.tags) ? s.tags.map(String) : [],
    context_notes: contextNotes,
    translated: s.translated === true || hasJapanese,
  };

  if (hasJapanese) {
    sentence.japanese = japanese!;
    sentence.reading = typeof s.reading === "string" ? s.reading : japanese!;
    sentence.romaji = typeof s.romaji === "string" ? s.romaji : "";
    const literalNote =
      typeof s.literal_note === "string"
        ? s.literal_note
        : undefined;
    if (literalNote) sentence.literal_note = literalNote;
  }

  return sentence;
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

export function normalizeEnglish(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}
