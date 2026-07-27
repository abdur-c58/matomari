import type { Dataset, Sentence, SeedSentence, SentenceDialectTranslations, TranslatedFields } from "@/types/sentence";
import { getAllSentences } from "@/lib/validation/dataset-schema";
import {
  applyTranslation,
  isTranslated,
  needsTranslation,
  toSeedPayload,
} from "@/lib/sentence-utils";
import type { Dialect } from "@/lib/constants/dialect";
import { DEFAULT_DIALECT } from "@/lib/constants/dialect";
import { KANSAI_FEATURE_ENABLED } from "@/lib/constants/kansai-feature";
import { isValidKanaReading } from "@/lib/audio/tts-text";
import { validatePlaceholderTranslations } from "@/lib/sentence/placeholders";
import { getSentenceTranslationFields } from "@/lib/services/dialect-translation-service";

const BATCH_SIZE = 15;

export type TranslationProgressCallback = (completed: number, total: number) => void;

export type TranslationBatchPersist = (
  translations: Record<string, TranslatedFields>
) => Promise<void>;

export interface TranslateOptions {
  force?: boolean;
  dialect?: Dialect;
  /** Required for dialect-specific bulk translate (e.g. Kansai while primary is Standard). */
  sentenceTranslations?: Record<string, SentenceDialectTranslations>;
  onProgress?: TranslationProgressCallback;
  /** Persist only the batch translations (lightweight; preferred for bulk translate). */
  persistBatch?: TranslationBatchPersist;
  /** @deprecated Prefer persistBatch — clones the full dataset each batch. */
  persist?: (dataset: Dataset) => Promise<void>;
  /** Retry failed API batches before giving up (default 2). */
  batchRetries?: number;
}

export class TranslationError extends Error {
  constructor(
    message: string,
    public code: "NOT_CONFIGURED" | "REQUEST_FAILED"
  ) {
    super(message);
    this.name = "TranslationError";
  }
}

export function getUntranslated(sentences: Sentence[]): Sentence[] {
  return sentences.filter(needsTranslation);
}

export function getUntranslatedIds(dataset: Dataset): string[] {
  const all = getAllSentences(dataset);
  return [...all.values()].filter(needsTranslation).map((s) => s.id);
}

function needsTranslationForDialect(
  sentence: Sentence,
  dialect: Dialect,
  sentenceTranslations?: Record<string, SentenceDialectTranslations>
): boolean {
  return !getSentenceTranslationFields(
    sentence.id,
    dialect,
    sentenceTranslations,
    sentence
  );
}

async function fetchTranslationsWithRetry(
  seeds: SeedSentence[],
  options?: { dialect?: Dialect; onProgress?: TranslationProgressCallback; retries?: number }
): Promise<Record<string, TranslatedFields>> {
  const retries = options?.retries ?? 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchTranslations(seeds, options);
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw lastError;
}

export async function fetchTranslations(
  seeds: SeedSentence[],
  options?: { dialect?: Dialect; onProgress?: TranslationProgressCallback }
): Promise<Record<string, TranslatedFields>> {
  const merged: Record<string, TranslatedFields> = {};
  const total = seeds.length;
  const dialect = options?.dialect ?? DEFAULT_DIALECT;

  for (let i = 0; i < seeds.length; i += BATCH_SIZE) {
    const chunk = seeds.slice(i, i + BATCH_SIZE);
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentences: chunk, dialect }),
    });

    if (res.status === 503) {
      throw new TranslationError("AI is not configured", "NOT_CONFIGURED");
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Translation failed" }));
      throw new TranslationError(err.error ?? "Translation failed", "REQUEST_FAILED");
    }

    const data = (await res.json()) as { translations: Record<string, TranslatedFields> };
    Object.assign(merged, data.translations);
    options?.onProgress?.(Math.min(i + chunk.length, total), total);
  }

  return merged;
}

function mergeSentence(sentence: Sentence, fields: TranslatedFields): Sentence {
  return applyTranslation(sentence, fields);
}

function updateSentencesInDataset(
  dataset: Dataset,
  updates: Map<string, TranslatedFields>
): Dataset {
  const apply = (s: Sentence) => {
    const fields = updates.get(s.id);
    return fields ? mergeSentence(s, fields) : s;
  };

  return {
    main_pathway: {
      ...dataset.main_pathway,
      batches: dataset.main_pathway.batches.map((batch) => ({
        ...batch,
        sentences: batch.sentences.map(apply),
      })),
    },
    scenes: Object.fromEntries(
      Object.entries(dataset.scenes).map(([key, scene]) => [
        key,
        { ...scene, sentences: scene.sentences.map(apply) },
      ])
    ),
  };
}

export function mergeTranslations(
  dataset: Dataset,
  translations: Record<string, TranslatedFields>
): Dataset {
  const updates = new Map(Object.entries(translations));
  return updateSentencesInDataset(dataset, updates);
}

function validateTranslations(
  seeds: SeedSentence[],
  translations: Record<string, TranslatedFields>,
  dialect: Dialect = DEFAULT_DIALECT
) {
  for (const seed of seeds) {
    const fields = translations[seed.id];
    if (!fields?.japanese?.trim()) {
      throw new TranslationError(
        `Missing translation for sentence ${seed.id}`,
        "REQUEST_FAILED"
      );
    }
    const placeholderCheck = validatePlaceholderTranslations(
      fields.japanese,
      fields.reading,
      fields.placeholders,
      dialect === "kansai" ? fields.phonetic_reading : undefined
    );
    if (!placeholderCheck.valid) {
      throw new TranslationError(
        `Invalid kana reading for sentence ${seed.id}. ${placeholderCheck.error ?? "Retranslation required."}`,
        "REQUEST_FAILED"
      );
    }
    if (!fields.placeholders?.length && !isValidKanaReading(fields.reading)) {
      throw new TranslationError(
        `Invalid kana reading for sentence ${seed.id}. Retranslation required.`,
        "REQUEST_FAILED"
      );
    }
    if (dialect === "kansai" && !fields.phonetic_reading?.trim()) {
      throw new TranslationError(
        `Missing Kansai phonetic reading for sentence ${seed.id}. Retranslation required.`,
        "REQUEST_FAILED"
      );
    }
  }
}

export async function translateSentences(
  dataset: Dataset,
  sentenceIds: string[],
  options?: TranslateOptions
): Promise<{ dataset: Dataset; translatedCount: number }> {
  const dialect = options?.dialect ?? DEFAULT_DIALECT;
  if (dialect === "kansai" && !KANSAI_FEATURE_ENABLED) {
    throw new TranslationError(
      "Kansai translation is temporarily unavailable.",
      "REQUEST_FAILED"
    );
  }
  const all = getAllSentences(dataset);
  const targets = sentenceIds
    .map((id) => all.get(id))
    .filter((s): s is Sentence & { sourceType: "pathway" | "scene"; sourceKey: string } =>
      Boolean(s)
    );

  const toTranslate = options?.force
    ? targets.map((s) => ({ ...toSeedPayload(s), translated: false }))
    : targets
        .filter((s) =>
          needsTranslationForDialect(s, dialect, options?.sentenceTranslations)
        )
        .map(toSeedPayload);

  if (toTranslate.length === 0) {
    return { dataset, translatedCount: 0 };
  }

  let current = dataset;
  const accumulated: Record<string, TranslatedFields> = {};
  let completed = 0;
  const total = toTranslate.length;
  const useBatchPersist = Boolean(options?.persistBatch);

  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    const chunk = toTranslate.slice(i, i + BATCH_SIZE);
    const translations = await fetchTranslationsWithRetry(chunk, {
      dialect: options?.dialect,
      retries: options?.batchRetries,
    });
    validateTranslations(chunk, translations, dialect);

    if (useBatchPersist) {
      Object.assign(accumulated, translations);
      await options!.persistBatch!(translations);
    } else {
      current = mergeTranslations(current, translations);
      if (options?.persist) {
        await options.persist(current);
      }
    }

    completed += chunk.length;
    options?.onProgress?.(completed, total);
  }

  const resultDataset = useBatchPersist
    ? mergeTranslations(dataset, accumulated)
    : current;

  return { dataset: resultDataset, translatedCount: toTranslate.length };
}

export function collectSentencesByIds(dataset: Dataset, ids: string[]): Sentence[] {
  const all = getAllSentences(dataset);
  return ids
    .map((id) => all.get(id))
    .filter((s) => s !== undefined)
    .map(({ sourceType: _s, sourceKey: _k, ...sentence }) => sentence);
}

export function allIdsTranslated(dataset: Dataset, ids: string[]): boolean {
  return collectSentencesByIds(dataset, ids).every(isTranslated);
}
