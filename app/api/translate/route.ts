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

    const completion = await openai.chat.completions.create({
      model: getOpenAIModel(),
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You translate English sentences into natural Japanese for language learners. Return valid JSON only. The reading field must be kana-only (no kanji) and match spoken pronunciation exactly — the app uses it for text-to-speech.",
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