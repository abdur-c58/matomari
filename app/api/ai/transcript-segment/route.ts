import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth/require-user";
import { getOpenAIClient, getOpenAIModel, isOpenAIConfigured } from "@/lib/ai/openai";
import { openAIErrorResponse } from "@/lib/ai/errors";
import { buildTranscriptSegmentPrompt } from "@/lib/ai/prompts";
import {
  transcriptSegmentRequestSchema,
  transcriptSegmentResponseSchema,
} from "@/lib/ai/schemas";

const DEFAULT_MAX_SENTENCES = 12;

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
    const { transcript, maxSentences = DEFAULT_MAX_SENTENCES } =
      transcriptSegmentRequestSchema.parse(body);

    const openai = getOpenAIClient();
    const prompt = buildTranscriptSegmentPrompt(transcript, maxSentences);

    const completion = await openai.chat.completions.create({
      model: getOpenAIModel(),
      response_format: { type: "json_object" },
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You segment Japanese transcripts into study sentences for language learners. Return valid JSON only. Be selective — quality over quantity.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 500 });
    }

    const result = transcriptSegmentResponseSchema.parse(JSON.parse(raw));
    return NextResponse.json(result);
  } catch (e) {
    return openAIErrorResponse(e);
  }
}
