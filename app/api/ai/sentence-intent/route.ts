import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth/require-user";
import { getOpenAIClient, getOpenAIModel, isOpenAIConfigured } from "@/lib/ai/openai";
import { openAIErrorResponse } from "@/lib/ai/errors";
import { buildSentenceIntentPrompt } from "@/lib/ai/prompts";
import {
  sentenceIntentRequestSchema,
  sentenceIntentResponseSchema,
} from "@/lib/ai/schemas";

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
    const parsed = sentenceIntentRequestSchema.parse(body);

    const openai = getOpenAIClient();
    const prompt = buildSentenceIntentPrompt({
      english: parsed.english,
      sceneName: parsed.sceneName,
      register: parsed.register,
      conversationHistory: parsed.conversationHistory,
    });

    const completion = await openai.chat.completions.create({
      model: getOpenAIModel(),
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You detect ambiguity in learner English sentences for Japanese study. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 500 });
    }

    const result = sentenceIntentResponseSchema.parse(JSON.parse(raw));
    return NextResponse.json(result);
  } catch (e) {
    return openAIErrorResponse(e);
  }
}
