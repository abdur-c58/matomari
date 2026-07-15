import { NextResponse } from "next/server";
import { getOpenAIClient, getOpenAIModel, isOpenAIConfigured } from "@/lib/ai/openai";
import { openAIErrorResponse } from "@/lib/ai/errors";
import { buildIslandGenerationPrompt } from "@/lib/ai/prompts";
import { islandRequestSchema, islandGenerationResponseSchema } from "@/lib/ai/schemas";
import { resolveIslandSentences, slugifyIslandKey } from "@/lib/services/dataset-mutation-service";
import {
  formatIslandLevelPrompt,
  getIslandDurationTier,
  resolveIslandDifficultyRange,
  resolveIslandSentenceTarget,
} from "@/lib/constants/island-generation";
import { sanitizeParalinguisticTags } from "@/lib/audio/fish-audio-cues";
import type { Sentence } from "@/types/sentence";

export async function POST(request: Request) {
  try {
    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const body = await request.json();
    const parsed = islandRequestSchema.parse(body);
    const {
      theme,
      sentenceCount,
      durationTier,
      difficultyMode,
      format,
      difficultyRange,
      levelMode,
      fluencyLevel,
      jlptLevel,
      extraInstructions,
      sentenceCatalog,
      existingIslandKeys = [],
    } = parsed;

    const tier = getIslandDurationTier(durationTier);
    const targetCount = sentenceCount ?? resolveIslandSentenceTarget(durationTier);
    const natural = difficultyMode === "natural";
    const resolvedDifficulty =
      natural
        ? undefined
        : difficultyRange ??
          resolveIslandDifficultyRange({ levelMode, fluencyLevel, jlptLevel });

    const openai = getOpenAIClient();
    const prompt = buildIslandGenerationPrompt(
      theme,
      targetCount,
      sentenceCatalog,
      {
        difficultyMode,
        format,
        durationLabel: `${tier.label} (${tier.durationLabel}, ${tier.sentenceRangeLabel} sentences)`,
        levelDescription: natural
          ? undefined
          : formatIslandLevelPrompt({ levelMode, fluencyLevel, jlptLevel }),
        difficultyRange: resolvedDifficulty,
        extraInstructions,
      }
    );

    const completion = await openai.chat.completions.create({
      model: getOpenAIModel(),
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You generate structured language island data for a Japanese learning app. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 500 });
    }

    const generated = islandGenerationResponseSchema.parse(JSON.parse(raw));

    let islandKey = generated.islandKey;
    if (existingIslandKeys.includes(islandKey)) {
      islandKey = slugifyIslandKey(theme, existingIslandKeys);
    }

    const catalogMap = new Map<string, Sentence>(
      sentenceCatalog.map((s) => [s.id, s])
    );
    const { sentences, reusedIds, newCount, skippedCount } = resolveIslandSentences(
      generated.sentences,
      catalogMap,
      islandKey,
      new Set(sentenceCatalog.map((s) => s.id)),
      { format, difficultyMode }
    );

    const islandFormat = format === "narration" ? "narration" : "standard";
    const narrationMode =
      islandFormat === "narration"
        ? {
            context:
              generated.narrationMode?.context.trim() ||
              `${theme} — ${generated.description}`,
            toneTags:
              sanitizeParalinguisticTags(generated.narrationMode?.toneTags) ?? [
                `speaking naturally within a ${theme} conversation`,
              ],
          }
        : undefined;

    return NextResponse.json({
      islandKey,
      description: generated.description,
      subtopics: generated.subtopics,
      format: islandFormat,
      speakers: islandFormat === "narration" ? (["A", "B"] as const) : undefined,
      narrationMode,
      sentences,
      reusedIds,
      newCount,
      skippedCount,
      difficultyMode,
      durationTier,
    });
  } catch (e) {
    return openAIErrorResponse(e);
  }
}
