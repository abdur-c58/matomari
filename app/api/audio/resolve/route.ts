import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getTextHash, generateServerAudio } from "@/lib/audio/generate-audio";
import { getSpokenScriptFromFields } from "@/lib/audio/tts-text";
import { ONLINE_FIRST_ENABLED } from "@/lib/constants/online-first";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueTtsJob } from "@/lib/supabase/tts-jobs";
import { getAudioMetadataByTextHash } from "@/lib/supabase/server-data";
import { getSignedAudioUrl } from "@/lib/storage/signed-url";
import { r2ObjectExists } from "@/lib/storage/r2-client";
import type { TranslatedFields } from "@/types/sentence";
import { resolveNarrationVoiceFishId } from "@/lib/constants/narration-voices";

const bodySchema = z.object({
  sentenceId: z.string().min(1),
  japanese: z.string().min(1),
  reading: z.string().optional().nullable(),
  phonetic_reading: z.string().optional().nullable(),
  placeholders: z.array(z.any()).optional(),
  dialect: z.enum(["standard", "kansai"]).default("standard"),
  speaker: z.enum(["A", "B"]).default("A"),
  /** Catalog voice id or Fish reference_id. */
  voiceId: z.string().min(1).max(128).optional().nullable(),
  register: z.string().optional(),
  tags: z.array(z.string()).optional(),
  context_notes: z.string().optional(),
  english: z.string().optional(),
  fishAudio: z.any().optional(),
  paralinguisticTags: z.array(z.string()).optional(),
  cacheBySpokenScript: z.boolean().optional().default(false),
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
        paralinguisticTags: input.paralinguisticTags,
      },
      {
        dialect: input.dialect,
        learnerName: input.learnerName,
        fishAudio: input.fishAudio,
        paralinguisticTags: input.paralinguisticTags,
      }
    );

    if (!spoken) {
      return NextResponse.json(
        { error: "Missing reading", code: "MISSING_READING" },
        { status: 422 }
      );
    }

    const resolvedVoiceId =
      resolveNarrationVoiceFishId(input.voiceId ?? undefined) ??
      input.voiceId?.trim() ??
      null;
    const textHash = getTextHash(
      input.sentenceId,
      spoken,
      input.dialect,
      input.speaker,
      input.cacheBySpokenScript ? "spoken-script" : "sentence",
      resolvedVoiceId
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

    // Generate on play when missing (no cron required for cache misses).
    try {
      const supabase = createAdminClient();
      let canonicalSentenceId: string | null = null;
      if (supabase) {
        const { data } = await supabase
          .from("canonical_sentences")
          .select("id")
          .eq("legacy_id", input.sentenceId)
          .maybeSingle();
        canonicalSentenceId = (data?.id as string | undefined) ?? null;
      }

      const generated = await generateServerAudio(spoken, input.sentenceId, {
        dialect: input.dialect,
        speaker: input.speaker,
        scope: "canonical",
        canonicalSentenceId,
        cacheMode: input.cacheBySpokenScript ? "spoken-script" : "sentence",
        voiceId: resolvedVoiceId,
      });
      const url = await getSignedAudioUrl(generated.r2Key);
      if (url) {
        return NextResponse.json({
          status: "ready",
          textHash: generated.hash,
          r2Key: generated.r2Key,
          url,
          byteSize: generated.buffer.byteLength,
          streamPath: `/api/audio/${encodeURIComponent(generated.hash)}`,
          generated: !generated.cached,
        });
      }
    } catch {
      // Fall through to background queue when inline generation fails.
    }

    await enqueueTtsJob({
      legacySentenceId: input.sentenceId,
      dialect: input.dialect,
      speaker: input.speaker,
      scope: "canonical",
      spokenScript: spoken,
      cacheMode: input.cacheBySpokenScript ? "spoken-script" : "sentence",
    });

    // Also ensure translation row exists for worker field load when possible
    const supabase = createAdminClient();
    if (supabase && input.english) {
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
