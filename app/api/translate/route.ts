import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth/require-user";
import { getOpenAIClient, getOpenAIModel, isOpenAIConfigured } from "@/lib/ai/openai";
import { openAIErrorResponse } from "@/lib/ai/errors";
import { buildTranslationPrompt } from "@/lib/ai/prompts";
import { translateRequestSchema, translateResponseSchema } from "@/lib/ai/schemas";
import { resolveTranslationScope } from "@/lib/cloud/sentence-scope";
import { ONLINE_FIRST_ENABLED } from "@/lib/constants/online-first";
import { KANSAI_FEATURE_ENABLED } from "@/lib/constants/kansai-feature";
import { persistDurableTranslationBatch } from "@/lib/supabase/durable-translations";

export async function POST(request: Request) {
  try {
    const user = await requireUserSession();
    if (!user.ok) {
      return NextResponse.json({ error: user.error }, { status: user.status });
    }
    const userId = user.userId;

    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const body = await request.json();
    const { sentences, dialect } = translateRequestSchema.parse(body);

    if (dialect === "kansai" && !KANSAI_FEATURE_ENABLED) {
      return NextResponse.json(
        {
          error:
            "Kansai translation is temporarily unavailable. Standard Japanese is still available.",
        },
        { status: 403 }
      );
    }

    if (sentences.length === 0) {
      return NextResponse.json({ translations: {} });
    }

    const openai = getOpenAIClient();
    const prompt = buildTranslationPrompt(sentences, dialect);

    const systemContent =
      dialect === "kansai"
        ? "You translate English into natural Kansai Japanese for language learners. Return valid JSON only. reading and phonetic_reading must be kana-only (no kanji). Polite Kansai often overlaps with standard polite forms — use subtle native choices (e.g. ん before です), not forced slang. phonetic_reading is the Kansai TTS script: it must preserve the exact meaning, politeness, and sentence type of japanese — adjust pronunciation only, never rewrite into a different sentence."
        : "You translate English sentences into natural Japanese for language learners. Return valid JSON only. The reading field must be kana-only (no kanji), match spoken pronunciation exactly, and preserve correct pitch accent/intonation — the app's TTS engine reads the kanji surface form directly and uses reading as the authoritative pronunciation guide and learner display.";

    const completion = await openai.chat.completions.create({
      model: getOpenAIModel(),
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemContent,
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 500 });
    }

    const parsed = translateResponseSchema.parse(JSON.parse(raw));
    const seedById = new Map(sentences.map((s) => [s.id, s]));

    const durableBatch = Object.entries(parsed.translations).flatMap(
      ([legacyId, fields]) => {
        const seed = seedById.get(legacyId);
        if (!seed || !fields?.japanese?.trim()) return [];
        const scope = resolveTranslationScope(legacyId, userId);
        return [
          {
            legacySentenceId: legacyId,
            english: seed.english,
            dialect,
            fields,
            scope,
            ownerUserId: scope === "user" ? userId : null,
            speaker: seed.speaker === "B" ? ("B" as const) : ("A" as const),
            provenance: "ai" as const,
            force: false,
          },
        ];
      }
    );

    if (ONLINE_FIRST_ENABLED) {
      const durable = await persistDurableTranslationBatch(durableBatch);
      if (!durable.ok) {
        return NextResponse.json(
          {
            error: "Failed to persist translations to the cloud",
            code: "DURABLE_WRITE_FAILED",
            details: durable.failed.slice(0, 8),
          },
          { status: 502 }
        );
      }
    } else {
      // Legacy best-effort path when online-first is disabled.
      try {
        await persistDurableTranslationBatch(durableBatch);
      } catch {
        // non-fatal
      }
    }

    return NextResponse.json(parsed);
  } catch (e) {
    return openAIErrorResponse(e);
  }
}
