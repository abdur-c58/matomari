import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth/require-user";
import { getOpenAIClient, getOpenAIModel, isOpenAIConfigured } from "@/lib/ai/openai";
import { openAIErrorResponse } from "@/lib/ai/errors";
import { buildNameTranslationPrompt } from "@/lib/ai/prompts";
import {
  translateNameRequestSchema,
  translateNameResponseSchema,
} from "@/lib/ai/schemas";
import { isValidKanaReading } from "@/lib/audio/tts-text";

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
    const { name } = translateNameRequestSchema.parse(body);

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: getOpenAIModel(),
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You transliterate personal names into natural Japanese katakana for language learners. Return valid JSON only.",
        },
        { role: "user", content: buildNameTranslationPrompt(name) },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 500 });
    }

    const parsed = translateNameResponseSchema.parse(JSON.parse(raw));
    const kana = parsed.kana.trim();

    if (!isValidKanaReading(kana)) {
      return NextResponse.json(
        { error: "AI returned invalid kana for name" },
        { status: 422 }
      );
    }

    return NextResponse.json({ kana });
  } catch (e) {
    return openAIErrorResponse(e);
  }
}
