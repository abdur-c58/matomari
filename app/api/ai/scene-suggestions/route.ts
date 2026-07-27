import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth/require-user";
import { getOpenAIClient, getOpenAIModel, isOpenAIConfigured } from "@/lib/ai/openai";
import { openAIErrorResponse } from "@/lib/ai/errors";
import { buildSceneSuggestionsPrompt } from "@/lib/ai/prompts";
import {
  sceneSuggestionsRequestSchema,
  sceneSuggestionsResponseSchema,
} from "@/lib/ai/schemas";
import {
  fetchCachedSceneSuggestions,
  upsertCachedSceneSuggestions,
} from "@/lib/supabase/scene-suggestions-data";

async function generateSceneSuggestions(parsed: {
  existingSceneKeys: string[];
  pathwayBatchTitles: string[];
  pathwaySubtopics?: string[];
}) {
  const openai = getOpenAIClient();
  const prompt = buildSceneSuggestionsPrompt({
    existingSceneKeys: parsed.existingSceneKeys,
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
          "You suggest practical Japanese language scene themes for a learning app. Return valid JSON only.",
      },
      { role: "user", content: prompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Empty AI response");
  }

  return sceneSuggestionsResponseSchema.parse(JSON.parse(raw));
}

export async function POST(request: Request) {
  try {
    const user = await requireUserSession();
    if (!user.ok) {
      return NextResponse.json({ error: user.error }, { status: user.status });
    }

    const body = await request.json();
    const parsed = sceneSuggestionsRequestSchema.parse(body);

    if (!parsed.refresh) {
      const cached = await fetchCachedSceneSuggestions(user.userId);
      if (cached) {
        return NextResponse.json({ suggestions: cached, cached: true });
      }
    }

    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const result = await generateSceneSuggestions(parsed);
    await upsertCachedSceneSuggestions(user.userId, result.suggestions);

    return NextResponse.json({ suggestions: result.suggestions, cached: false });
  } catch (e) {
    return openAIErrorResponse(e);
  }
}
