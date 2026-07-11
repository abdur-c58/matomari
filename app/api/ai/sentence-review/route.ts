import { NextResponse } from "next/server";
import { getOpenAIClient, getOpenAIModel, isOpenAIConfigured } from "@/lib/ai/openai";
import { openAIErrorResponse } from "@/lib/ai/errors";
import { buildSentenceReviewPrompt } from "@/lib/ai/prompts";
import {
  sentenceReviewRequestSchema,
  sentenceReviewResponseSchema,
} from "@/lib/ai/schemas";

export async function POST(request: Request) {
  try {
    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const body = await request.json();
    const parsed = sentenceReviewRequestSchema.parse(body);

    const openai = getOpenAIClient();
    const prompt = buildSentenceReviewPrompt({
      english: parsed.english,
      register: parsed.register,
      contextNotes: parsed.contextNotes,
      islandName: parsed.islandName,
    });

    const completion = await openai.chat.completions.create({
      model: getOpenAIModel(),
      response_format: { type: "json_object" },
      max_tokens: 320,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You review English sentences for Japanese learners. Return valid JSON only. Be brief — max 2 grammar notes and 2 tone questions.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 500 });
    }

    const result = sentenceReviewResponseSchema.parse(JSON.parse(raw));
    return NextResponse.json(result);
  } catch (e) {
    return openAIErrorResponse(e);
  }
}
