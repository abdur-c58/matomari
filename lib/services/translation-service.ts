import type { Dataset, Sentence, SeedSentence, TranslatedFields } from "@/types/sentence";
import { getAllSentences } from "@/lib/validation/dataset-schema";
import {
  applyTranslation,
  isTranslated,
  needsTranslation,
  toSeedPayload,
} from "@/lib/sentence-utils";
import type { Dialect } from "@/lib/constants/dialect";
import { DEFAULT_DIALECT } from "@/lib/constants/dialect";
import { isValidKanaReading } from "@/lib/audio/tts-text";

const BATCH_SIZE = 30;

export type TranslationProgressCallback = (completed: number, total: number) => void;

export interface TranslateOptions {
  force?: boolean;
  dialect?: Dialect;
  onProgress?: TranslationProgressCallback;
  persist?: (dataset: Dataset) => Promise<void>;
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

export async function fetchTranslations(
  seeds: SeedSentence[],
  options?: { dialect?: Dialect; onProgress?: TranslationProgressCallback }
): Promise<Record<string, TranslatedFields>> {
  const merged: Record<string, TranslatedFields> = {};
  const total = seeds.length;

  for (let i = 0; i < seeds.length; i += BATCH_SIZE) {
    const chunk = seeds.slice(i, i + BATCH_SIZE);
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentences: chunk }),
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
    islands: Object.fromEntries(
      Object.entries(dataset.islands).map(([key, island]) => [
        key,
        { ...island, sentences: island.sentences.map(apply) },
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

function validateTranslations(seeds: SeedSentence[], translations: Record<string, TranslatedFields>) {
  for (const seed of seeds) {
    const fields = translations[seed.id];
    if (!fields?.japanese?.trim()) {
      throw new TranslationError(
        `Missing translation for sentence ${seed.id}`,
        "REQUEST_FAILED"
      );
    }
    if (!isValidKanaReading(fields.reading)) {
      throw new TranslationError(
        `Invalid kana reading for sentence ${seed.id}. Retranslation required.`,
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
  const all = getAllSentences(dataset);
  const targets = sentenceIds
    .map((id) => all.get(id))
    .filter((s): s is Sentence & { sourceType: "pathway" | "island"; sourceKey: string } =>
      Boolean(s)
    );

  const toTranslate = options?.force
    ? targets.map((s) => ({ ...toSeedPayload(s), translated: false }))
    : targets.filter(needsTranslation).map(toSeedPayload);

  if (toTranslate.length === 0) {
    return { dataset, translatedCount: 0 };
  }

  let current = dataset;
  let completed = 0;
  const total = toTranslate.length;

  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    const chunk = toTranslate.slice(i, i + BATCH_SIZE);
    const translations = await fetchTranslations(chunk, { dialect: options?.dialect });
    validateTranslations(chunk, translations);

    current = mergeTranslations(current, translations);
    completed += chunk.length;
    options?.onProgress?.(completed, total);

    if (options?.persist) {
      await options.persist(current);
    }
  }

  return { dataset: current, translatedCount: toTranslate.length };
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
