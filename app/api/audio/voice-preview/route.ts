import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth/require-user";
import {
  getAvailableNarrationVoices,
  NARRATION_VOICE_PREVIEW_TEXT,
  resolveNarrationVoiceFishId,
} from "@/lib/constants/narration-voices";
import { generateServerAudio } from "@/lib/audio/generate-audio";
import { getSignedAudioUrl } from "@/lib/storage/signed-url";

/** List available voices, or stream a cached preview clip for one voice. */
export async function GET(request: Request) {
  const user = await requireUserSession();
  if (!user.ok) {
    return NextResponse.json({ error: user.error }, { status: user.status });
  }

  const url = new URL(request.url);
  const voiceId = url.searchParams.get("voiceId");

  if (!voiceId) {
    return NextResponse.json({
      voices: getAvailableNarrationVoices().map((v) => ({
        id: v.id,
        label: v.label,
        description: v.description,
      })),
    });
  }

  const fishId = resolveNarrationVoiceFishId(voiceId);
  if (!fishId) {
    return NextResponse.json({ error: "Unknown voice" }, { status: 404 });
  }

  // Previews amortize Fish cost via TTS cache (same spoken script + voice).
  try {
    const generated = await generateServerAudio(
      NARRATION_VOICE_PREVIEW_TEXT,
      `voice-preview:${voiceId}`,
      {
        dialect: "standard",
        speaker: "A",
        cacheMode: "spoken-script",
        voiceId: fishId,
      }
    );
    const signed = await getSignedAudioUrl(generated.r2Key);
    if (signed) {
      return NextResponse.redirect(signed, 302);
    }
    return new NextResponse(new Uint8Array(generated.buffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Preview generation failed",
      },
      { status: 502 }
    );
  }
}
