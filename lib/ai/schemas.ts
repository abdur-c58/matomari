import { z } from "zod";
import { islandSchema, seedSentenceSchema, sentenceSchema } from "@/lib/validation/dataset-schema";
import {
  DEFAULT_ISLAND_FLUENCY_LEVEL,
  DEFAULT_ISLAND_JLPT_LEVEL,
  DEFAULT_ISLAND_LEVEL_MODE,
} from "@/lib/constants/island-generation";

const islandLevelModeSchema = z.enum(["fluency", "jlpt"]);
const islandFluencyLevelSchema = z.enum([
  "beginner",
  "elementary",
  "intermediate",
  "upper_intermediate",
  "advanced",
]);
const islandJlptLevelSchema = z.enum(["N5", "N4", "N3", "N2", "N1"]);

const tutorContextSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("general") }),
  z.object({ type: z.literal("sentence"), sentenceId: z.string().min(1) }),
  z.object({ type: z.literal("island"), islandKey: z.string().min(1) }),
]);

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const sentenceCatalogEntrySchema = z.object({
  id: z.string(),
  english: z.string(),
  difficulty: z.number(),
  category: z.string(),
  register: z.string(),
  subtopic: z.string(),
  japanese: z.string().optional(),
  reading: z.string().optional(),
  romaji: z.string().optional(),
  tags: z.array(z.string()).optional(),
  context_notes: z.string().optional(),
  translated: z.boolean().optional(),
});

const datasetSummarySchema = z.object({
  islandKeys: z.array(z.string()),
  sentenceCount: z.number(),
  sentenceCatalog: z.array(sentenceCatalogEntrySchema),
  focusSentence: z
    .object({
      id: z.string(),
      english: z.string(),
      difficulty: z.number(),
      category: z.string(),
      register: z.string(),
      subtopic: z.string(),
      tags: z.array(z.string()),
      japanese: z.string().optional(),
      reading: z.string().optional(),
      romaji: z.string().optional(),
      context_notes: z.string().optional(),
      literal_note: z.string().optional(),
      translated: z.boolean().optional(),
      rating: z.number().nullable().optional(),
      meaningConfirmed: z.boolean().optional(),
    })
    .optional(),
  focusIsland: z
    .object({
      key: z.string(),
      description: z.string(),
      subtopics: z.array(z.string()),
      sentences: z.array(sentenceCatalogEntrySchema),
    })
    .optional(),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  context: tutorContextSchema,
  datasetSummary: datasetSummarySchema,
});

export const islandRequestSchema = z.object({
  theme: z.string().min(2).max(200),
  sentenceCount: z.number().int().min(5).max(75).optional(),
  difficultyRange: z.tuple([z.number(), z.number()]).optional(),
  levelMode: islandLevelModeSchema.optional().default(DEFAULT_ISLAND_LEVEL_MODE),
  fluencyLevel: islandFluencyLevelSchema.optional().default(DEFAULT_ISLAND_FLUENCY_LEVEL),
  jlptLevel: islandJlptLevelSchema.optional().default(DEFAULT_ISLAND_JLPT_LEVEL),
  extraInstructions: z.string().max(500).optional(),
  sentenceCatalog: z.array(sentenceSchema),
  existingIslandKeys: z.array(z.string()).optional(),
});

export const islandGenerationResponseSchema = z.object({
  islandKey: z.string().min(1),
  description: z.string(),
  subtopics: z.array(z.string()),
  reusedIds: z.array(z.string()),
  sentences: z.array(seedSentenceSchema),
});

export const translateRequestSchema = z.object({
  sentences: z.array(seedSentenceSchema).min(1).max(30),
});

export const translateResponseSchema = z.object({
  translations: z.record(
    z.string(),
    z.object({
      japanese: z.string().min(1),
      reading: z.string(),
      romaji: z.string(),
      literal_note: z.string().optional(),
    })
  ),
});

export const islandSuggestionsRequestSchema = z.object({
  existingIslandKeys: z.array(z.string()),
  pathwayBatchTitles: z.array(z.string()),
  pathwaySubtopics: z.array(z.string()).optional(),
});

export const islandSuggestionSchema = z.object({
  theme: z.string().min(2),
  reason: z.string().min(2),
});

export const islandSuggestionsResponseSchema = z.object({
  suggestions: z.array(islandSuggestionSchema).min(1).max(8),
});

export const islandPreviewSchema = islandGenerationResponseSchema.extend({
  newCount: z.number(),
});

export const sentenceReviewRequestSchema = z.object({
  english: z.string().min(1).max(500),
  register: z.enum(["casual", "polite", "formal"]).optional(),
  contextNotes: z.string().max(300).optional(),
  islandName: z.string().max(120).optional(),
});

export const sentenceReviewResponseSchema = z.object({
  correctedEnglish: z.string().min(1),
  grammarNotes: z.array(z.string()).max(4),
  toneQuestions: z.array(z.string()).max(3),
  suggestedRegister: z.enum(["casual", "polite", "formal"]),
  suggestedContextNotes: z.string().optional(),
  hasIssues: z.boolean(),
});

export const transcriptSegmentRequestSchema = z.object({
  transcript: z.string().min(20).max(15000),
  maxSentences: z.number().int().min(3).max(25).optional(),
});

export const transcriptSegmentSentenceSchema = z.object({
  japanese: z.string().min(1),
  english: z.string().min(1),
  reading: z.string().min(1),
  romaji: z.string().optional(),
  register: z.enum(["casual", "polite", "formal"]),
  context_notes: z.string().optional(),
  reason: z.string().min(1),
});

export const transcriptSegmentResponseSchema = z.object({
  suggestedName: z.string().min(1),
  description: z.string().min(1),
  sentences: z.array(transcriptSegmentSentenceSchema).min(1).max(25),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type IslandRequest = z.infer<typeof islandRequestSchema>;

export { islandSchema };
