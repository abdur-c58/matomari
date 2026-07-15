import { z } from "zod";
import {
  isNarrationPauseMs,
  NARRATION_PAUSE_MS_OPTIONS,
  sanitizeParalinguisticTags,
} from "@/lib/audio/fish-audio-cues";
import {
  isTranslated,
  normalizeEnglish,
  normalizeLegacySentence,
} from "@/lib/sentence-utils";
import type { Dataset, Island, Sentence } from "@/types/sentence";

const registerSchema = z.enum(["casual", "polite", "formal"]);

const difficultySchema = z
  .number()
  .nullable()
  .refine((v) => v == null || (Number.isFinite(v) && v >= 1 && v <= 5), {
    message: "difficulty must be null or between 1 and 5",
  });

/** Free-form Fish tags — not an enum. */
export const paralinguisticTagsSchema = z
  .array(z.string())
  .optional()
  .transform((tags) => sanitizeParalinguisticTags(tags));

/** Legacy structured Fish directives (premade catalogs). */
export const fishAudioDirectivesSchema = z
  .object({
    expression: z.string().min(1).optional(),
    effect: z.string().min(1).optional(),
    breakCue: z.string().min(1).optional(),
  })
  .refine(
    (v) => Boolean(v.expression || v.effect || v.breakCue),
    { message: "fishAudio requires at least one cue" }
  );

export const narrationAudioSchema = z.object({
  pauseAfterMs: z
    .number()
    .refine(isNarrationPauseMs, {
      message: `pauseAfterMs must be one of ${NARRATION_PAUSE_MS_OPTIONS.join(", ")}`,
    }),
  fishAudio: fishAudioDirectivesSchema.optional(),
  paralinguisticTags: paralinguisticTagsSchema,
});

export const seedSentenceSchema = z.object({
  id: z.string().min(1),
  english: z.string().min(1),
  register: registerSchema,
  difficulty: difficultySchema,
  category: z.string(),
  subtopic: z.string(),
  tags: z.array(z.string()),
  context_notes: z.string().optional(),
  translated: z.boolean().default(false),
  speaker: z.enum(["A", "B"]).optional(),
  paralinguisticTags: paralinguisticTagsSchema,
  narrationAudio: narrationAudioSchema.optional(),
});

export const sentencePlaceholderSchema = z.object({
  tag: z.string().min(1),
  resolveAs: z.enum(["learner", "literal"]),
  readingSubstitute: z.string().min(1),
  label: z.string().optional(),
});

export const translatedFieldsSchema = z.object({
  japanese: z.string().min(1),
  reading: z.string(),
  romaji: z.string(),
  literal_note: z.string().optional(),
  phonetic_reading: z.string().optional(),
  placeholders: z.array(sentencePlaceholderSchema).optional(),
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

const islandCreatedBySchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1),
});

const islandProvenanceSchema = z.object({
  kind: z.enum(["owned", "shared", "cloned", "premade", "ai"]),
  shareId: z.string().optional(),
  sourceIslandId: z.string().optional(),
  ownerUserId: z.string().optional(),
  clonedFromShareId: z.string().optional(),
});

const islandNarrationModeSchema = z.object({
  context: z.string().min(1).max(500),
  toneTags: z
    .array(z.string())
    .transform((tags) => sanitizeParalinguisticTags(tags) ?? []),
});

export const islandSchema = z.object({
  description: z.string(),
  subtopics: z.array(z.string()),
  sentences: z.array(z.unknown()),
  title: z.string().optional(),
  themeKanji: z.string().optional(),
  featured: z.boolean().optional(),
  format: z.enum(["standard", "narration"]).optional(),
  speakers: z.array(z.enum(["A", "B"])).optional(),
  narrationMode: islandNarrationModeSchema.optional(),
  id: z.string().uuid().optional(),
  createdBy: islandCreatedBySchema.optional(),
  difficultyMode: z.enum(["matched", "natural"]).optional(),
  durationTier: z.enum(["quick", "standard", "deep"]).optional(),
  provenance: islandProvenanceSchema.optional(),
  readOnly: z.boolean().optional(),
});

export const datasetSchema = z.object({
  main_pathway: z.object({
    description: z.string(),
    batches: z.array(pathwayBatchSchema),
  }),
  islands: z.record(z.string(), islandSchema).default({}),
});

export type DatasetInput = Dataset;

function normalizeIsland(island: z.infer<typeof islandSchema>): Island {
  return {
    description: island.description,
    subtopics: island.subtopics,
    title: island.title,
    themeKanji: island.themeKanji,
    featured: island.featured,
    format: island.format,
    speakers: island.speakers,
    narrationMode: island.narrationMode,
    id: island.id,
    createdBy: island.createdBy,
    difficultyMode: island.difficultyMode,
    durationTier: island.durationTier,
    provenance: island.provenance,
    // readOnly is never persisted from imports — only composed at runtime
    sentences: island.sentences.map((s) => normalizeLegacySentence(s)),
  };
}

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
      Object.entries(raw.islands).map(([key, island]) => [key, normalizeIsland(island)])
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

/** Narration islands must have complete speaker + pause coverage. */
export function validateNarrationIsland(island: Island): void {
  if (island.format !== "narration") return;

  if (!island.speakers || island.speakers.length === 0) {
    throw new Error("Narration islands require speakers");
  }

  for (const s of island.sentences) {
    if (s.speaker !== "A" && s.speaker !== "B") {
      throw new Error(`Narration sentence "${s.id}" is missing speaker A/B`);
    }
    if (!s.narrationAudio || typeof s.narrationAudio.pauseAfterMs !== "number") {
      throw new Error(`Narration sentence "${s.id}" is missing narrationAudio.pauseAfterMs`);
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
