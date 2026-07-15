import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getTextHash } from "@/lib/audio/generate-audio";
import { getSpokenScriptFromFields } from "@/lib/audio/tts-text";
import { ONLINE_FIRST_ENABLED } from "@/lib/constants/online-first";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueTtsJob } from "@/lib/supabase/tts-jobs";
import { getAudioMetadataByTextHash } from "@/lib/supabase/server-data";
import { getSignedAudioUrl } from "@/lib/storage/signed-url";
import { r2ObjectExists } from "@/lib/storage/r2-client";
import type { TranslatedFields } from "@/types/sentence";

const bodySchema = z.object({
  sentenceId: z.string().min(1),
  japanese: z.string().min(1),
  reading: z.string().optional().nullable(),
  phonetic_reading: z.string().optional().nullable(),
  placeholders: z.array(z.any()).optional(),
  dialect: z.enum(["standard", "kansai"]).default("standard"),
  speaker: z.enum(["A", "B"]).default("A"),
  register: z.string().optional(),
  tags: z.array(z.string()).optional(),
  context_notes: z.string().optional(),
  english: z.string().optional(),
  fishAudio: z.any().optional(),
  learnerName: z.string().nullable().optional(),
});

/**
 * Resolve an immutable audio asset for playback.
 * Returns signed URL when ready, or generation status when queued.
 */
export async function POST(request: Request) {
  try {
    if (ONLINE_FIRST_ENABLED) {
      const session = await auth();
      if (!session?.user?.supabaseUserId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const input = bodySchema.parse(await request.json());
    const spoken = getSpokenScriptFromFields(
      {
        japanese: input.japanese,
        reading: input.reading,
        phonetic_reading: input.phonetic_reading,
        placeholders: input.placeholders as TranslatedFields["placeholders"],
        register: input.register,
        tags: input.tags,
        context_notes: input.context_notes,
        english: input.english,
        fishAudio: input.fishAudio,
      },
      {
        dialect: input.dialect,
        learnerName: input.learnerName,
        fishAudio: input.fishAudio,
      }
    );

    if (!spoken) {
      return NextResponse.json(
        { error: "Missing reading", code: "MISSING_READING" },
        { status: 422 }
      );
    }

    const textHash = getTextHash(
      input.sentenceId,
      spoken,
      input.dialect,
      input.speaker
    );

    const meta = await getAudioMetadataByTextHash(textHash);
    if (meta?.r2_key && meta.generation_status !== "failed") {
      const exists = await r2ObjectExists(meta.r2_key);
      if (exists) {
        const url = await getSignedAudioUrl(meta.r2_key);
        if (url) {
          return NextResponse.json({
            status: "ready",
            textHash,
            r2Key: meta.r2_key,
            url,
            byteSize: meta.byte_size ?? null,
            streamPath: `/api/audio/${encodeURIComponent(textHash)}`,
          });
        }
      }
    }

    // Fallback: object exists under expected hash key even if metadata missing
    const { getAudioR2Key } = await import("@/lib/storage/r2-client");
    const r2Key = getAudioR2Key(textHash);
    if (await r2ObjectExists(r2Key)) {
      const url = await getSignedAudioUrl(r2Key);
      if (url) {
        return NextResponse.json({
          status: "ready",
          textHash,
          r2Key,
          url,
          streamPath: `/api/audio/${encodeURIComponent(textHash)}`,
        });
      }
    }

    // Queue generation
    await enqueueTtsJob({
      legacySentenceId: input.sentenceId,
      dialect: input.dialect,
      speaker: input.speaker,
      scope: "canonical",
      spokenScript: spoken,
    });

    // Also ensure translation row exists for worker field load when possible
    const supabase = createAdminClient();
    if (supabase && input.english) {
      // worker can still use shared_sentence_translations fallback
      void supabase;
    }

    return NextResponse.json({
      status: "queued",
      textHash,
      message: "Audio is being prepared",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Resolve failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
