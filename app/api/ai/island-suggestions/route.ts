import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOpenAIClient, getOpenAIModel, isOpenAIConfigured } from "@/lib/ai/openai";
import { openAIErrorResponse } from "@/lib/ai/errors";
import { buildIslandSuggestionsPrompt } from "@/lib/ai/prompts";
import {
  islandSuggestionsRequestSchema,
  islandSuggestionsResponseSchema,
} from "@/lib/ai/schemas";
import {
  fetchCachedIslandSuggestions,
  upsertCachedIslandSuggestions,
} from "@/lib/supabase/island-suggestions-data";

async function generateIslandSuggestions(parsed: {
  existingIslandKeys: string[];
  pathwayBatchTitles: string[];
  pathwaySubtopics?: string[];
}) {
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
    throw new Error("Empty AI response");
  }

  return islandSuggestionsResponseSchema.parse(JSON.parse(raw));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = islandSuggestionsRequestSchema.parse(body);
    const session = await auth();
    const userId = session?.user?.supabaseUserId;

    if (!parsed.refresh && userId) {
      const cached = await fetchCachedIslandSuggestions(userId);
      if (cached) {
        return NextResponse.json({ suggestions: cached, cached: true });
      }
    }

    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const result = await generateIslandSuggestions(parsed);

    if (userId) {
      await upsertCachedIslandSuggestions(userId, result.suggestions);
    }

    return NextResponse.json({ suggestions: result.suggestions, cached: false });
  } catch (e) {
    return openAIErrorResponse(e);
  }
}
