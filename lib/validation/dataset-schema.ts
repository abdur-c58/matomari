import { z } from "zod";
import {
  isTranslated,
  normalizeEnglish,
  normalizeLegacySentence,
} from "@/lib/sentence-utils";
import type { Dataset, Sentence } from "@/types/sentence";

const registerSchema = z.enum(["casual", "polite", "formal"]);

export const seedSentenceSchema = z.object({
  id: z.string().min(1),
  english: z.string().min(1),
  register: registerSchema,
  difficulty: z.number(),
  category: z.string(),
  subtopic: z.string(),
  tags: z.array(z.string()),
  context_notes: z.string().optional(),
  translated: z.boolean().default(false),
});

export const translatedFieldsSchema = z.object({
  japanese: z.string().min(1),
  reading: z.string(),
  romaji: z.string(),
  literal_note: z.string().optional(),
});

export const sentenceSchema = seedSentenceSchema.extend({
  japanese: z.string().optional(),
  reading: z.string().optional(),
  romaji: z.string().optional(),
  literal_note: z.string().optional(),
  notes: z.string().optional(),
});

export const pathwayBatchSchema = z.object({
  batch_number: z.number(),
  batch_title: z.string(),
  target_difficulty_range: z.tuple([z.number(), z.number()]),
  sentences: z.array(z.unknown()),
});

export const islandSchema = z.object({
  description: z.string(),
  subtopics: z.array(z.string()),
  sentences: z.array(z.unknown()),
});

export const datasetSchema = z.object({
  main_pathway: z.object({
    description: z.string(),
    batches: z.array(pathwayBatchSchema),
  }),
  islands: z.record(z.string(), islandSchema).default({}),
});

export type DatasetInput = Dataset;

function normalizeDatasetSentences(raw: z.infer<typeof datasetSchema>): Dataset {
  return {
    main_pathway: {
      ...raw.main_pathway,
      batches: raw.main_pathway.batches.map((batch) => ({
        ...batch,
        sentences: batch.sentences.map((s) => normalizeLegacySentence(s)),
      })),
    },
    islands: Object.fromEntries(
      Object.entries(raw.islands).map(([key, island]) => [
        key,
        {
          ...island,
          sentences: island.sentences.map((s) => normalizeLegacySentence(s)),
        },
      ])
    ),
  };
}

export function validateIslandUniqueness(island: { sentences: Sentence[] }): void {
  const ids = new Set<string>();
  const japanese = new Set<string>();
  const english = new Set<string>();

  for (const s of island.sentences) {
    if (ids.has(s.id)) throw new Error(`Duplicate sentence id: ${s.id}`);
    ids.add(s.id);

    if (isTranslated(s) && s.japanese) {
      const norm = s.japanese.trim().replace(/\s+/g, "");
      if (japanese.has(norm)) throw new Error(`Duplicate japanese: ${s.japanese}`);
      japanese.add(norm);
    } else {
      const norm = normalizeEnglish(s.english);
      if (english.has(norm)) throw new Error(`Duplicate english: ${s.english}`);
      english.add(norm);
    }
  }
}

export function parseDataset(json: unknown): Dataset {
  const parsed = datasetSchema.parse(json);
  return normalizeDatasetSentences(parsed);
}

export function getAllSentences(dataset: DatasetInput) {
  const sentences = new Map<
    string,
    Sentence & { sourceType: "pathway" | "island"; sourceKey: string }
  >();

  for (const batch of dataset.main_pathway.batches) {
    for (const s of batch.sentences) {
      sentences.set(s.id, {
        ...s,
        sourceType: "pathway",
        sourceKey: String(batch.batch_number),
      });
    }
  }

  for (const [key, island] of Object.entries(dataset.islands)) {
    for (const s of island.sentences) {
      sentences.set(s.id, { ...s, sourceType: "island", sourceKey: key });
    }
  }

  return sentences;
}
