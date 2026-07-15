import { createHash } from "crypto";
import type { Dialect } from "@/lib/constants/dialect";
import { contentFingerprint } from "@/lib/cloud/content-fingerprint";
import { createAdminClient } from "@/lib/supabase/admin";
import { upsertSharedTranslationBatch } from "@/lib/supabase/shared-translations-data";
import { enqueueTtsJob } from "@/lib/supabase/tts-jobs";
import type {
  NarrationSpeaker,
  SentencePlaceholder,
  TranslatedFields,
} from "@/types/sentence";

export type TranslationScope = "canonical" | "user";

export type DurableTranslationInput = {
  legacySentenceId: string;
  english: string;
  dialect: Dialect;
  fields: TranslatedFields;
  scope: TranslationScope;
  ownerUserId?: string | null;
  speaker?: NarrationSpeaker;
  provenance?: "ai" | "import" | "manual" | "backfill";
  metadata?: Record<string, unknown>;
  /** When true, overwrite an existing translation for this dialect. */
  force?: boolean;
};

export type DurableTranslationResult = {
  ok: boolean;
  created: boolean;
  revision: number;
  canonicalSentenceId?: string;
  userSentenceId?: string;
  error?: string;
};

function normalizeFields(fields: TranslatedFields): TranslatedFields {
  return {
    japanese: fields.japanese,
    reading: fields.reading,
    romaji: fields.romaji ?? "",
    literal_note: fields.literal_note,
    phonetic_reading: fields.phonetic_reading,
    placeholders: fields.placeholders as SentencePlaceholder[] | undefined,
  };
}

async function ensureCanonicalSentence(input: {
  legacySentenceId: string;
  english: string;
  speaker?: NarrationSpeaker;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string } | { error: string }> {
  const supabase = createAdminClient();
  if (!supabase) return { error: "Supabase not configured" };

  const fingerprint = contentFingerprint(input.english);
  const { data: existing } = await supabase
    .from("canonical_sentences")
    .select("id, content_fingerprint")
    .eq("legacy_id", input.legacySentenceId)
    .maybeSingle();

  if (existing) {
    if (
      existing.content_fingerprint &&
      existing.content_fingerprint !== fingerprint
    ) {
      // Collision on legacy id with different English — keep existing row but flag metadata.
      console.warn(
        `canonical_sentences fingerprint mismatch for ${input.legacySentenceId}`
      );
    }
    return { id: existing.id as string };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("canonical_sentences")
    .upsert(
      {
        legacy_id: input.legacySentenceId,
        english: input.english,
        content_fingerprint: fingerprint,
        source: input.legacySentenceId.startsWith("premade_")
          ? "premade"
          : "pathway",
        speaker: input.speaker === "B" ? "B" : input.speaker === "A" ? "A" : null,
        metadata: input.metadata ?? {},
        updated_at: now,
      },
      { onConflict: "legacy_id" }
    )
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed to upsert sentence" };
  return { id: data.id as string };
}

async function ensureUserSentence(input: {
  ownerUserId: string;
  legacySentenceId: string;
  english: string;
  speaker?: NarrationSpeaker;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string } | { error: string }> {
  const supabase = createAdminClient();
  if (!supabase) return { error: "Supabase not configured" };

  const fingerprint = contentFingerprint(input.english);
  const { data: existing } = await supabase
    .from("user_sentences")
    .select("id")
    .eq("user_id", input.ownerUserId)
    .eq("legacy_id", input.legacySentenceId)
    .maybeSingle();

  if (existing) return { id: existing.id as string };

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("user_sentences")
    .upsert(
      {
        user_id: input.ownerUserId,
        legacy_id: input.legacySentenceId,
        english: input.english,
        content_fingerprint: fingerprint,
        speaker: input.speaker === "B" ? "B" : input.speaker === "A" ? "A" : null,
        metadata: input.metadata ?? {},
        updated_at: now,
      },
      { onConflict: "user_id,legacy_id" }
    )
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed to upsert user sentence" };
  return { id: data.id as string };
}

/**
 * Persist a translation durably and enqueue background TTS.
 * Dual-writes to legacy shared_sentence_translations for compatibility.
 */
export async function persistDurableTranslation(
  input: DurableTranslationInput
): Promise<DurableTranslationResult> {
  const supabase = createAdminClient();
  if (!supabase) {
    return { ok: false, created: false, revision: 0, error: "Supabase not configured" };
  }

  if (!input.fields.japanese?.trim()) {
    return { ok: false, created: false, revision: 0, error: "Missing japanese" };
  }

  const fields = normalizeFields(input.fields);
  const speaker = input.speaker === "B" ? "B" : "A";
  const provenance = input.provenance ?? "ai";
  const now = new Date().toISOString();

  try {
    if (input.scope === "user") {
      if (!input.ownerUserId) {
        return {
          ok: false,
          created: false,
          revision: 0,
          error: "ownerUserId required for user translations",
        };
      }

      const sentence = await ensureUserSentence({
        ownerUserId: input.ownerUserId,
        legacySentenceId: input.legacySentenceId,
        english: input.english,
        speaker,
        metadata: input.metadata,
      });
      if ("error" in sentence) {
        return { ok: false, created: false, revision: 0, error: sentence.error };
      }

      const { data: existing } = await supabase
        .from("user_sentence_translations")
        .select("revision")
        .eq("sentence_id", sentence.id)
        .eq("dialect", input.dialect)
        .maybeSingle();

      if (existing && !input.force) {
        const job = await enqueueTtsJob({
          legacySentenceId: input.legacySentenceId,
          dialect: input.dialect,
          speaker,
          scope: "user",
          ownerUserId: input.ownerUserId,
          userSentenceId: sentence.id,
        });
        if (!job.ok) {
          return {
            ok: false,
            created: false,
            revision: existing.revision as number,
            userSentenceId: sentence.id,
            error: job.error,
          };
        }
        return {
          ok: true,
          created: false,
          revision: existing.revision as number,
          userSentenceId: sentence.id,
        };
      }

      const revision = existing ? Number(existing.revision) + 1 : 1;
      const { error } = await supabase.from("user_sentence_translations").upsert(
        {
          sentence_id: sentence.id,
          dialect: input.dialect,
          fields,
          revision,
          provenance,
          updated_at: now,
        },
        { onConflict: "sentence_id,dialect" }
      );
      if (error) {
        return { ok: false, created: false, revision: 0, error: error.message };
      }

      const job = await enqueueTtsJob({
        legacySentenceId: input.legacySentenceId,
        dialect: input.dialect,
        speaker,
        scope: "user",
        ownerUserId: input.ownerUserId,
        userSentenceId: sentence.id,
      });
      if (!job.ok) {
        return {
          ok: false,
          created: true,
          revision,
          userSentenceId: sentence.id,
          error: `Translation saved but TTS enqueue failed: ${job.error}`,
        };
      }

      return {
        ok: true,
        created: !existing,
        revision,
        userSentenceId: sentence.id,
      };
    }

    // Canonical
    const sentence = await ensureCanonicalSentence({
      legacySentenceId: input.legacySentenceId,
      english: input.english,
      speaker,
      metadata: input.metadata,
    });
    if ("error" in sentence) {
      return { ok: false, created: false, revision: 0, error: sentence.error };
    }

    const { data: existing } = await supabase
      .from("canonical_sentence_translations")
      .select("revision")
      .eq("sentence_id", sentence.id)
      .eq("dialect", input.dialect)
      .maybeSingle();

    if (existing && !input.force) {
      await upsertSharedTranslationBatch(
        { [input.legacySentenceId]: fields },
        input.dialect
      );
      const job = await enqueueTtsJob({
        legacySentenceId: input.legacySentenceId,
        dialect: input.dialect,
        speaker,
        scope: "canonical",
        canonicalSentenceId: sentence.id,
      });
      if (!job.ok) {
        return {
          ok: false,
          created: false,
          revision: existing.revision as number,
          canonicalSentenceId: sentence.id,
          error: job.error,
        };
      }
      return {
        ok: true,
        created: false,
        revision: existing.revision as number,
        canonicalSentenceId: sentence.id,
      };
    }

    const revision = existing ? Number(existing.revision) + 1 : 1;
    const { error } = await supabase.from("canonical_sentence_translations").upsert(
      {
        sentence_id: sentence.id,
        dialect: input.dialect,
        fields,
        revision,
        provenance,
        updated_at: now,
      },
      { onConflict: "sentence_id,dialect" }
    );
    if (error) {
      return { ok: false, created: false, revision: 0, error: error.message };
    }

    // Dual-write legacy shared map for older clients
    await upsertSharedTranslationBatch(
      { [input.legacySentenceId]: fields },
      input.dialect
    );

    const job = await enqueueTtsJob({
      legacySentenceId: input.legacySentenceId,
      dialect: input.dialect,
      speaker,
      scope: "canonical",
      canonicalSentenceId: sentence.id,
    });
    if (!job.ok) {
      return {
        ok: false,
        created: true,
        revision,
        canonicalSentenceId: sentence.id,
        error: `Translation saved but TTS enqueue failed: ${job.error}`,
      };
    }

    return {
      ok: true,
      created: !existing,
      revision,
      canonicalSentenceId: sentence.id,
    };
  } catch (e) {
    return {
      ok: false,
      created: false,
      revision: 0,
      error: e instanceof Error ? e.message : "Durable translation failed",
    };
  }
}

export async function persistDurableTranslationBatch(
  batch: Array<Omit<DurableTranslationInput, "fields"> & { fields: TranslatedFields }>
): Promise<{ ok: boolean; failed: string[]; results: DurableTranslationResult[] }> {
  const results: DurableTranslationResult[] = [];
  const failed: string[] = [];

  for (const item of batch) {
    const result = await persistDurableTranslation(item);
    results.push(result);
    if (!result.ok) failed.push(`${item.legacySentenceId}: ${result.error ?? "unknown"}`);
  }

  return { ok: failed.length === 0, failed, results };
}

/** Deterministic short hash for diagnosing identity (not a crypto secret). */
export function shortIdentityTag(english: string, legacyId: string): string {
  return createHash("sha256")
    .update(`${legacyId}|${english.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 12);
}
