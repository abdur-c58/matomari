import { z } from "zod";
import { sceneSchema, seedSentenceSchema, sentenceSchema } from "@/lib/validation/dataset-schema";
import {
  DEFAULT_SCENE_DIFFICULTY_MODE,
  DEFAULT_SCENE_DURATION_TIER,
  DEFAULT_SCENE_FLUENCY_LEVEL,
  DEFAULT_SCENE_GENERATION_FORMAT,
  DEFAULT_SCENE_JLPT_LEVEL,
  DEFAULT_SCENE_LEVEL_MODE,
} from "@/lib/constants/scene-generation";

const sceneLevelModeSchema = z.enum(["fluency", "jlpt"]);
const sceneFluencyLevelSchema = z.enum([
  "beginner",
  "elementary",
  "intermediate",
  "upper_intermediate",
  "advanced",
]);
const sceneJlptLevelSchema = z.enum(["N5", "N4", "N3", "N2", "N1"]);

const tutorContextSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("general") }),
  z.object({ type: z.literal("sentence"), sentenceId: z.string().min(1) }),
  z.object({ type: z.literal("scene"), sceneKey: z.string().min(1) }),
]);

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const sentenceCatalogEntrySchema = z.object({
  id: z.string(),
  english: z.string(),
  difficulty: z.number().nullable(),
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
  sceneKeys: z.array(z.string()),
  sentenceCount: z.number(),
  sentenceCatalog: z.array(sentenceCatalogEntrySchema),
  focusSentence: z
    .object({
      id: z.string(),
      english: z.string(),
              difficulty: z.number().nullable(),
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
  focusScene: z
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

export const sceneRequestSchema = z.object({
  theme: z.string().min(2).max(200),
  sentenceCount: z.number().int().min(5).max(150).optional(),
  durationTier: z
    .enum(["quick", "standard", "deep", "epic"])
    .optional()
    .default(DEFAULT_SCENE_DURATION_TIER),
  difficultyMode: z
    .enum(["matched", "natural"])
    .optional()
    .default(DEFAULT_SCENE_DIFFICULTY_MODE),
  format: z
    .enum(["standard", "narration"])
    .optional()
    .default(DEFAULT_SCENE_GENERATION_FORMAT),
  difficultyRange: z.tuple([z.number(), z.number()]).optional(),
  levelMode: sceneLevelModeSchema.optional().default(DEFAULT_SCENE_LEVEL_MODE),
  fluencyLevel: sceneFluencyLevelSchema.optional().default(DEFAULT_SCENE_FLUENCY_LEVEL),
  jlptLevel: sceneJlptLevelSchema.optional().default(DEFAULT_SCENE_JLPT_LEVEL),
  extraInstructions: z.string().max(500).optional(),
  sentenceCatalog: z.array(sentenceSchema),
  existingSceneKeys: z.array(z.string()).optional(),
});

export const generatedSceneSentenceSchema = z.object({
  id: z.string().min(1),
  english: z.string().min(1).optional(),
  register: z.enum(["casual", "polite", "formal"]).optional(),
  difficulty: z.number().nullable().optional(),
  category: z.string().optional(),
  subtopic: z.string().optional(),
  tags: z.array(z.string()).optional(),
  paralinguisticTags: z.array(z.string()).optional(),
  context_notes: z.string().optional(),
  translated: z.boolean().optional(),
  speaker: z.enum(["A", "B"]).optional(),
  narrationAudio: z
    .object({
      pauseAfterMs: z.number().optional(),
      fishAudio: z
        .object({
          expression: z.string().optional(),
          effect: z.string().optional(),
          breakCue: z.string().optional(),
        })
        .optional(),
      paralinguisticTags: z.array(z.string()).optional(),
    })
    .optional(),
});

export const sceneGenerationResponseSchema = z.object({
  sceneKey: z.string().min(1),
  description: z.string(),
  subtopics: z.array(z.string()),
  format: z.enum(["standard", "narration"]).optional(),
  speakers: z.array(z.enum(["A", "B"])).optional(),
  narrationMode: z
    .object({
      context: z.string().min(1).max(500),
      toneTags: z.array(z.string()).min(1).max(4),
    })
    .optional(),
  reusedIds: z.array(z.string()),
  sentences: z.array(generatedSceneSentenceSchema),
});

export const translateRequestSchema = z.object({
  sentences: z.array(seedSentenceSchema).min(1).max(30),
  dialect: z.enum(["standard", "kansai"]).optional().default("standard"),
});

export const translateResponseSchema = z.object({
  translations: z.record(
    z.string(),
    z.object({
      japanese: z.string().min(1),
      reading: z.string(),
      romaji: z.string(),
      literal_note: z.string().optional(),
      phonetic_reading: z.string().optional(),
      placeholders: z
        .array(
          z.object({
            tag: z.string().min(1),
            resolveAs: z.enum(["learner", "literal"]),
            readingSubstitute: z.string().min(1),
            label: z.string().optional(),
          })
        )
        .optional(),
    })
  ),
});

export const sceneSuggestionsRequestSchema = z.object({
  existingSceneKeys: z.array(z.string()),
  pathwayBatchTitles: z.array(z.string()),
  pathwaySubtopics: z.array(z.string()).optional(),
  refresh: z.boolean().optional().default(false),
});

export const sceneSuggestionSchema = z.object({
  theme: z.string().min(2),
  reason: z.string().min(2),
});

export const sceneSuggestionsResponseSchema = z.object({
  suggestions: z.array(sceneSuggestionSchema).min(1).max(8),
});

export const scenePreviewSchema = sceneGenerationResponseSchema.extend({
  newCount: z.number(),
});

export const sentenceReviewRequestSchema = z.object({
  english: z.string().min(1).max(500),
  register: z.enum(["casual", "polite", "formal"]).optional(),
  contextNotes: z.string().max(300).optional(),
  sceneName: z.string().max(120).optional(),
});

export const sentenceReviewResponseSchema = z.object({
  correctedEnglish: z.string().min(1),
  grammarNotes: z.array(z.string()).max(4),
  toneQuestions: z.array(z.string()).max(3),
  suggestedRegister: z.enum(["casual", "polite", "formal"]),
  suggestedContextNotes: z.string().optional(),
  hasIssues: z.boolean(),
});

export const sentenceIntentMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

export const sentenceIntentRequestSchema = z.object({
  english: z.string().min(1).max(500),
  sceneName: z.string().max(120).optional(),
  register: z.enum(["casual", "polite", "formal"]).optional(),
  conversationHistory: z.array(sentenceIntentMessageSchema).optional(),
});

export const sentenceIntentResponseSchema = z.object({
  status: z.enum(["ready", "clarify"]),
  question: z.string().optional(),
  refinedEnglish: z.string().optional(),
  suggestedRegister: z.enum(["casual", "polite", "formal"]).optional(),
  suggestedContextNotes: z.string().optional(),
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

export const translateNameRequestSchema = z.object({
  name: z.string().min(1).max(80),
});

export const translateNameResponseSchema = z.object({
  kana: z.string().min(1),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type SceneRequest = z.infer<typeof sceneRequestSchema>;

export { sceneSchema };
