import { NextResponse } from "next/server";
import { getOpenAIClient, getOpenAIModel, isOpenAIConfigured } from "@/lib/ai/openai";
import { openAIErrorResponse } from "@/lib/ai/errors";
import { buildTranslationPrompt } from "@/lib/ai/prompts";
import { translateRequestSchema, translateResponseSchema } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  try {
    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const body = await request.json();
    const { sentences, dialect } = translateRequestSchema.parse(body);

    if (sentences.length === 0) {
      return NextResponse.json({ translations: {} });
    }

    const openai = getOpenAIClient();
    const prompt = buildTranslationPrompt(sentences, dialect);

    const systemContent =
      dialect === "kansai"
        ? "You translate English into natural Kansai Japanese for language learners. Return valid JSON only. reading and phonetic_reading must be kana-only (no kanji) and reflect the correct pitch accent and intonation for every word. phonetic_reading is a separate exaggerated Osaka-ben TTS script for voice synthesis — the app uses it instead of reading for Kansai audio."
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
    return NextResponse.json(parsed);
  } catch (e) {
    return openAIErrorResponse(e);
  }
}