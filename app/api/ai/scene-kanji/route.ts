import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserSession } from "@/lib/auth/require-user";
import { getOpenAIClient, getOpenAIModel, isOpenAIConfigured } from "@/lib/ai/openai";
import { openAIErrorResponse } from "@/lib/ai/errors";

const requestSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  subtopics: z.array(z.string()).optional(),
});

const responseSchema = z.object({
  themeKanji: z.string().min(1).max(4),
});

export async function POST(request: Request) {
  try {
    const user = await requireUserSession();
    if (!user.ok) {
      return NextResponse.json({ error: user.error }, { status: user.status });
    }

    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const body = requestSchema.parse(await request.json());
    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: getOpenAIModel(),
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You pick decorative Japanese kanji for language-learning scene themes. Return JSON only.",
        },
        {
          role: "user",
          content: `Pick 1–2 kanji that visually represent this study scene theme. Use real kanji only (no Latin).

Title: ${body.title}
Description: ${body.description}
Subtopics: ${(body.subtopics ?? []).join(", ") || "none"}

Return: {"themeKanji":"..."}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 500 });
    }

    const parsed = responseSchema.parse(JSON.parse(raw));
    return NextResponse.json({ themeKanji: parsed.themeKanji.slice(0, 2) });
  } catch (e) {
    return openAIErrorResponse(e);
  }
}
