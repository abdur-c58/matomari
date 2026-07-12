import type { Dataset, Sentence, SentenceDialectTranslations, TranslatedFields, UserLibrary } from "@/types/sentence";
import type { Dialect } from "@/lib/constants/dialect";
import { DIALECTS } from "@/lib/constants/dialect";
import { applyTranslation } from "@/lib/sentence-utils";
import { getAllSentences } from "@/lib/validation/dataset-schema";

export function seedStandardTranslationsFromDataset(
  dataset: Dataset,
  existing: Record<string, SentenceDialectTranslations> = {}
): Record<string, SentenceDialectTranslations> {
  const result: Record<string, SentenceDialectTranslations> = { ...existing };
  let changed = false;

  for (const [, sentence] of getAllSentences(dataset)) {
    if (!sentence.japanese?.trim()) continue;
    if (result[sentence.id]?.standard?.japanese?.trim()) continue;

    result[sentence.id] = {
      ...result[sentence.id],
      standard: {
        japanese: sentence.japanese,
        reading: sentence.reading ?? sentence.japanese,
        romaji: sentence.romaji ?? "",
        literal_note: sentence.literal_note,
        phonetic_reading: sentence.phonetic_reading,
        placeholders: sentence.placeholders,
      },
    };
    changed = true;
  }

  return changed ? result : existing;
}

export function applyDialectTranslations(
  dataset: Dataset,
  sentenceTranslations: Record<string, SentenceDialectTranslations>,
  dialect: Dialect
): Dataset {
  const apply = (s: Sentence): Sentence => {
    const fields = sentenceTranslations[s.id]?.[dialect];
    if (fields?.japanese?.trim()) {
      return applyTranslation(s, fields);
    }

    if (dialect === "standard" && s.japanese?.trim()) {
      return { ...s, translated: true };
    }

    return {
      ...s,
      japanese: undefined,
      reading: undefined,
      romaji: undefined,
      literal_note: undefined,
      phonetic_reading: undefined,
      placeholders: undefined,
      translated: false,
    };
  };

  return {
    main_pathway: {
      ...dataset.main_pathway,
      batches: dataset.main_pathway.batches.map((batch) => ({
        ...batch,
        sentences: batch.sentences.map(apply),
      })),
    },
    islands: Object.fromEntries(
      Object.entries(dataset.islands).map(([key, island]) => [
        key,
        { ...island, sentences: island.sentences.map(apply) },
      ])
    ),
  };
}

export function collectTranslationsForDialect(
  dataset: Dataset,
  dialect: Dialect,
  existing: Record<string, SentenceDialectTranslations> = {}
): Record<string, SentenceDialectTranslations> {
  const result: Record<string, SentenceDialectTranslations> = { ...existing };

  for (const [, sentence] of getAllSentences(dataset)) {
    if (!sentence.japanese?.trim()) continue;
    result[sentence.id] = {
      ...result[sentence.id],
      [dialect]: {
        japanese: sentence.japanese,
        reading: sentence.reading ?? sentence.japanese,
        romaji: sentence.romaji ?? "",
        literal_note: sentence.literal_note,
        phonetic_reading: sentence.phonetic_reading,
        placeholders: sentence.placeholders,
      },
    };
  }

  return result;
}

export function mergeSentenceTranslations(
  base: Record<string, SentenceDialectTranslations> | undefined,
  updates: Record<string, Partial<Record<Dialect, TranslatedFields>>>
): Record<string, SentenceDialectTranslations> {
  const result: Record<string, SentenceDialectTranslations> = { ...(base ?? {}) };

  for (const [id, dialectFields] of Object.entries(updates)) {
    result[id] = { ...result[id], ...dialectFields };
  }

  return result;
}

export function hasTranslationForDialect(
  sentenceId: string,
  dialect: Dialect,
  translations: Record<string, SentenceDialectTranslations> | undefined
): boolean {
  return Boolean(translations?.[sentenceId]?.[dialect]?.japanese?.trim());
}

export function getSentenceTranslationFields(
  sentenceId: string,
  dialect: Dialect,
  translations: Record<string, SentenceDialectTranslations> | undefined,
  pathwaySentence?: Pick<
    Sentence,
    "japanese" | "reading" | "romaji" | "literal_note" | "phonetic_reading" | "placeholders"
  >
): TranslatedFields | null {
  const stored = translations?.[sentenceId]?.[dialect];
  if (stored?.japanese?.trim()) return stored;

  if (dialect === "standard" && pathwaySentence?.japanese?.trim()) {
    return {
      japanese: pathwaySentence.japanese,
      reading: pathwaySentence.reading ?? pathwaySentence.japanese,
      romaji: pathwaySentence.romaji ?? "",
      literal_note: pathwaySentence.literal_note,
      phonetic_reading: pathwaySentence.phonetic_reading,
      placeholders: pathwaySentence.placeholders,
    };
  }

  return null;
}

export function getUntranslatedIdsForDialect(
  dataset: Dataset,
  translations: Record<string, SentenceDialectTranslations> | undefined,
  dialect: Dialect
): string[] {
  const ids: string[] = [];
  for (const id of getAllSentences(dataset).keys()) {
    if (!getSentenceTranslationFields(id, dialect, translations)) {
      ids.push(id);
    }
  }
  return ids;
}

/** True when another dialect has a translation but the active dialect does not. */
export function needsRetranslationForDialect(
  sentenceId: string,
  dialect: Dialect,
  translations: Record<string, SentenceDialectTranslations> | undefined
): boolean {
  if (hasTranslationForDialect(sentenceId, dialect, translations)) return false;
  const entry = translations?.[sentenceId];
  if (!entry) return false;
  return DIALECTS.some(
    (d) => d !== dialect && Boolean(entry[d]?.japanese?.trim())
  );
}

export function migrateLegacyIslandTranslations(library: UserLibrary): UserLibrary {
  if (library.sentenceTranslations && Object.keys(library.sentenceTranslations).length > 0) {
    return library;
  }

  const sentenceTranslations: Record<string, SentenceDialectTranslations> = {};

  for (const island of Object.values(library.islands)) {
    for (const sentence of island.sentences) {
      if (!sentence.japanese?.trim()) continue;
      sentenceTranslations[sentence.id] = {
        standard: {
          japanese: sentence.japanese,
          reading: sentence.reading ?? sentence.japanese,
          romaji: sentence.romaji ?? "",
          literal_note: sentence.literal_note,
          placeholders: sentence.placeholders,
        },
      };
    }
  }

  if (Object.keys(sentenceTranslations).length === 0) return library;

  return { ...library, sentenceTranslations };
}

export function stripTranslationsFromIslands(library: UserLibrary): UserLibrary {
  const islands = Object.fromEntries(
    Object.entries(library.islands).map(([key, island]) => [
      key,
      {
        ...island,
        sentences: island.sentences.map((s) => ({
          id: s.id,
          english: s.english,
          register: s.register,
          difficulty: s.difficulty,
          category: s.category,
          subtopic: s.subtopic,
          tags: s.tags,
          context_notes: s.context_notes,
          translated: false,
        })),
      },
    ])
  );

  return { ...library, islands };
}

export function stripKansaiTranslations(library: UserLibrary): {
  library: UserLibrary;
  removedCount: number;
} {
  const sentenceTranslations = library.sentenceTranslations;
  if (!sentenceTranslations || Object.keys(sentenceTranslations).length === 0) {
    return { library, removedCount: 0 };
  }

  let removedCount = 0;
  const next: Record<string, SentenceDialectTranslations> = {};

  for (const [id, entry] of Object.entries(sentenceTranslations)) {
    if (entry.kansai) {
      removedCount++;
    }

    const { kansai: _removed, ...rest } = entry;
    if (Object.keys(rest).length > 0) {
      next[id] = rest;
    }
  }

  return {
    library: {
      ...library,
      sentenceTranslations:
        Object.keys(next).length > 0 ? next : undefined,
    },
    removedCount,
  };
}
