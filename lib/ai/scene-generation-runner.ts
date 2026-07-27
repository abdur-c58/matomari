import type OpenAI from "openai";
import { buildSceneGenerationPrompt } from "@/lib/ai/prompts";
import { sceneGenerationResponseSchema } from "@/lib/ai/schemas";
import {
  SCENE_GENERATION_CHUNK_SIZE,
  type SceneDifficultyMode,
  type SceneGenerationFormat,
} from "@/lib/constants/scene-generation";
import type { z } from "zod";

type GeneratedScene = z.infer<typeof sceneGenerationResponseSchema>;

export async function generateSceneWithOptionalChunking(params: {
  openai: OpenAI;
  model: string;
  theme: string;
  targetCount: number;
  sentenceCatalog: Array<{
    id: string;
    english: string;
    difficulty: number | null;
    category: string;
    japanese?: string;
  }>;
  promptOptions: {
    difficultyMode: SceneDifficultyMode;
    format: SceneGenerationFormat;
    durationLabel: string;
    levelDescription?: string;
    difficultyRange?: [number, number];
    extraInstructions?: string;
  };
}): Promise<GeneratedScene> {
  const {
    openai,
    model,
    theme,
    targetCount,
    sentenceCatalog,
    promptOptions,
  } = params;

  if (targetCount <= SCENE_GENERATION_CHUNK_SIZE) {
    return runOneBatch({
      openai,
      model,
      theme,
      sentenceCount: targetCount,
      sentenceCatalog,
      promptOptions,
    });
  }

  const batchTargets: number[] = [];
  let remaining = targetCount;
  while (remaining > 0) {
    const n = Math.min(SCENE_GENERATION_CHUNK_SIZE, remaining);
    batchTargets.push(n);
    remaining -= n;
  }

  const allSentences: GeneratedScene["sentences"] = [];
  let first: GeneratedScene | null = null;

  for (let i = 0; i < batchTargets.length; i++) {
    const batchTarget = batchTargets[i]!;
    const priorTail = allSentences.slice(-6).map((s) => ({
      english: s.english ?? "",
      speaker: "speaker" in s ? (s as { speaker?: string }).speaker : undefined,
    }));
    const priorSummary =
      allSentences.length === 0
        ? undefined
        : `Covered ${allSentences.length} lines so far about "${theme}". Continue without repeating.`;

    const batch = await runOneBatch({
      openai,
      model,
      theme,
      sentenceCount: batchTarget,
      sentenceCatalog,
      promptOptions: {
        ...promptOptions,
        chunk: {
          batchIndex: i,
          batchCount: batchTargets.length,
          batchTarget,
          priorSummary,
          priorTail: priorTail.filter((t) => t.english),
        },
      },
    });

    if (!first) first = batch;
    allSentences.push(...batch.sentences);
  }

  if (!first) {
    throw new Error("Chunked scene generation produced no batches");
  }

  return {
    ...first,
    sentences: allSentences,
  };
}

async function runOneBatch(params: {
  openai: OpenAI;
  model: string;
  theme: string;
  sentenceCount: number;
  sentenceCatalog: Array<{
    id: string;
    english: string;
    difficulty: number | null;
    category: string;
    japanese?: string;
  }>;
  promptOptions: Parameters<typeof buildSceneGenerationPrompt>[3];
}): Promise<GeneratedScene> {
  const prompt = buildSceneGenerationPrompt(
    params.theme,
    params.sentenceCount,
    params.sentenceCatalog,
    params.promptOptions
  );

  const completion = await params.openai.chat.completions.create({
    model: params.model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You generate structured language scene data for a Japanese learning app. Return valid JSON only.",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Empty AI response");
  }

  return sceneGenerationResponseSchema.parse(JSON.parse(raw));
}
