import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth/require-user";
import { getOpenAIClient, getOpenAIModel, isOpenAIConfigured } from "@/lib/ai/openai";
import { openAIErrorResponse } from "@/lib/ai/errors";
import { generateSceneWithOptionalChunking } from "@/lib/ai/scene-generation-runner";
import { sceneRequestSchema } from "@/lib/ai/schemas";
import { resolveSceneSentences, slugifySceneKey } from "@/lib/services/dataset-mutation-service";
import {
  formatSceneLevelPrompt,
  getSceneDurationTier,
  resolveSceneDifficultyRange,
  resolveSceneSentenceTarget,
} from "@/lib/constants/scene-generation";
import { sanitizeParalinguisticTags } from "@/lib/audio/fish-audio-cues";
import {
  assertCanGenerateScene,
  EntitlementError,
  recordSceneGeneration,
  validateGeneratedSentenceCount,
} from "@/lib/services/entitlements-service";
import type { Sentence } from "@/types/sentence";

export async function POST(request: Request) {
  try {
    const user = await requireUserSession();
    if (!user.ok) {
      return NextResponse.json({ error: user.error }, { status: user.status });
    }

    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const body = await request.json();
    const parsed = sceneRequestSchema.parse(body);
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
      existingSceneKeys = [],
    } = parsed;

    const tier = getSceneDurationTier(durationTier);
    const targetCount = sentenceCount ?? resolveSceneSentenceTarget(durationTier);

    let entitlements;
    try {
      entitlements = await assertCanGenerateScene(user.userId, {
        targetSentenceCount: targetCount,
      });
    } catch (err) {
      if (err instanceof EntitlementError) {
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status: 403 }
        );
      }
      throw err;
    }

    if (format === "narration" && !entitlements.caps.allowsNarrationCreate) {
      return NextResponse.json(
        {
          error: "Narration scenes require Plus.",
          code: "narration_requires_plus",
        },
        { status: 403 }
      );
    }

    const natural = difficultyMode === "natural";
    const resolvedDifficulty = natural
      ? undefined
      : (difficultyRange ??
        resolveSceneDifficultyRange({ levelMode, fluencyLevel, jlptLevel }));

    const openai = getOpenAIClient();
    const generated = await generateSceneWithOptionalChunking({
      openai,
      model: getOpenAIModel(),
      theme,
      targetCount,
      sentenceCatalog,
      promptOptions: {
        difficultyMode,
        format,
        durationLabel: `${tier.label} (${tier.durationLabel}, ${tier.sentenceRangeLabel} sentences)`,
        levelDescription: natural
          ? undefined
          : formatSceneLevelPrompt({ levelMode, fluencyLevel, jlptLevel }),
        difficultyRange: resolvedDifficulty,
        extraInstructions,
      },
    });

    let sceneKey = generated.sceneKey;
    if (existingSceneKeys.includes(sceneKey)) {
      sceneKey = slugifySceneKey(theme, existingSceneKeys);
    }

    const catalogMap = new Map<string, Sentence>(
      sentenceCatalog.map((s) => [s.id, s])
    );
    const { sentences, reusedIds, newCount, skippedCount } = resolveSceneSentences(
      generated.sentences,
      catalogMap,
      sceneKey,
      new Set(sentenceCatalog.map((s) => s.id)),
      { format, difficultyMode }
    );

    try {
      validateGeneratedSentenceCount(sentences.length, entitlements.caps);
    } catch (err) {
      if (err instanceof EntitlementError) {
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status: 422 }
        );
      }
      throw err;
    }

    await recordSceneGeneration(user.userId);

    const sceneFormat = format === "narration" ? "narration" : "standard";
    const narrationMode =
      sceneFormat === "narration"
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
      sceneKey,
      description: generated.description,
      subtopics: generated.subtopics,
      format: sceneFormat,
      speakers: sceneFormat === "narration" ? (["A", "B"] as const) : undefined,
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
