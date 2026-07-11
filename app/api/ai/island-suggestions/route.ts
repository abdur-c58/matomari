import { NextResponse } from "next/server";
import { getOpenAIClient, getOpenAIModel, isOpenAIConfigured } from "@/lib/ai/openai";
import { openAIErrorResponse } from "@/lib/ai/errors";import { buildIslandSuggestionsPrompt } from "@/lib/ai/prompts";
import {
  islandSuggestionsRequestSchema,
  islandSuggestionsResponseSchema,
} from "@/lib/ai/schemas";

export async function POST(request: Request) {
  try {
    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const body = await request.json();
    const parsed = islandSuggestionsRequestSchema.parse(body);

    const openai = getOpenAIClient();
    const prompt = buildIslandSuggestionsPrompt({
      existingIslandKeys: parsed.existingIslandKeys,
      pathwayBatchTitles: parsed.pathwayBatchTitles,
      pathwaySubtopics: parsed.pathwaySubtopics ?? [],
    });

    const completion = await openai.chat.completions.create({
      model: getOpenAIModel(),
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You suggest practical Japanese language island themes for a learning app. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 500 });
    }

    const result = islandSuggestionsResponseSchema.parse(JSON.parse(raw));
    return NextResponse.json(result);
  } catch (e) {
    return openAIErrorResponse(e);
  }
}