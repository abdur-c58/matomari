import { NextResponse } from "next/server";
import { generateServerAudio } from "@/lib/audio/generate-audio";
import { getSpokenScriptFromFields } from "@/lib/audio/tts-text";
import { TtsQuotaError } from "@/lib/audio/tts-errors";
import type { Dialect } from "@/lib/constants/dialect";
import type { Register, SentencePlaceholder } from "@/types/sentence";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sentenceId,
      japanese,
      reading,
      phonetic_reading,
      placeholders,
      learnerName,
      dialect = "standard",
      register,
      tags,
      context_notes,
      english,
      force,
      ttsSource,
    } = body as {
      sentenceId?: string;
      japanese?: string;
      reading?: string;
      phonetic_reading?: string;
      placeholders?: SentencePlaceholder[];
      learnerName?: string | null;
      dialect?: Dialect;
      register?: Register;
      tags?: string[];
      context_notes?: string;
      english?: string;
      force?: boolean;
      ttsSource?: "surface" | "reading";
    };

    if (!sentenceId || !japanese) {
      return NextResponse.json(
        { error: "sentenceId and japanese are required" },
        { status: 400 }
      );
    }

    const spokenText = getSpokenScriptFromFields(
      {
        japanese,
        reading,
        phonetic_reading,
        placeholders,
        register,
        tags,
        context_notes,
        english,
      },
      { dialect, learnerName, ttsSource: ttsSource ?? "surface" }
    );

    if (!spokenText) {
      return NextResponse.json(
        {
          error:
            dialect === "kansai"
              ? "A Kansai phonetic reading is required for accent simulation. Retranslate this sentence."
              : "A kana-only reading is required for correct pronunciation. Retranslate this sentence.",
          code: "MISSING_READING",
        },
        { status: 422 }
      );
    }

    const { buffer, cached, hash } = await generateServerAudio(spokenText, sentenceId, {
      dialect,
      force: force === true,
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Audio-Cached": cached ? "true" : "false",
        "X-Audio-Hash": hash,
      },
    });
  } catch (e) {
    if (e instanceof TtsQuotaError) {
      return NextResponse.json(
        { error: e.message, code: "QUOTA_EXCEEDED" },
        { status: 429 }
      );
    }
    const message = e instanceof Error ? e.message : "TTS error";
    if (message === "TTS_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "TTS not configured", code: "NOT_CONFIGURED" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
