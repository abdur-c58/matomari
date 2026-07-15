import { getOpenAIClient, getOpenAIModel, isOpenAIConfigured } from "@/lib/ai/openai";
import { buildTranslationPrompt } from "@/lib/ai/prompts";
import { translateResponseSchema } from "@/lib/ai/schemas";
import { contentFingerprint } from "@/lib/cloud/content-fingerprint";
import {
  loadContentSeedsFromFiles,
  seedToMetadata,
  type ContentSeed,
} from "@/lib/cloud/content-seeds";
import type { Dialect } from "@/lib/constants/dialect";
import { KANSAI_FEATURE_ENABLED } from "@/lib/constants/kansai-feature";
import { createAdminClient } from "@/lib/supabase/admin";
import { persistDurableTranslation } from "@/lib/supabase/durable-translations";
import {
  fetchSharedTranslationsFromDb,
  upsertSharedSentenceTranslations,
} from "@/lib/supabase/shared-translations-data";
import type { SentenceDialectTranslations } from "@/types/sentence";

export type ReconcileResult = {
  scanned: number;
  unchanged: number;
  updated: number;
  staleMarked: number;
  created: number;
};

export type StaleProcessResult = {
  attempted: number;
  retranslated: number;
  failed: number;
  skipped: number;
};

type StaleRow = {
  sentence_id: string;
  dialect: Dialect;
  legacy_id: string;
  english: string;
  speaker: "A" | "B" | null;
  metadata: Record<string, unknown>;
  content_fingerprint: string;
};

async function clearLegacyDialectTranslation(
  legacyId: string,
  dialect: Dialect
): Promise<void> {
  const shared = await fetchSharedTranslationsFromDb();
  const existing = shared?.translations?.[legacyId];
  if (!existing) return;

  const next: SentenceDialectTranslations = { ...existing };
  delete next[dialect];
  if (Object.keys(next).length === 0) {
    const supabase = createAdminClient();
    if (!supabase) return;
    await supabase
      .from("shared_sentence_translations")
      .delete()
      .eq("sentence_id", legacyId);
    return;
  }

  await upsertSharedSentenceTranslations({ [legacyId]: next });
}

async function markDialectStale(input: {
  sentenceId: string;
  dialect: Dialect;
  legacyId: string;
  reason: string;
  fingerprint: string;
}): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase) return;

  const now = new Date().toISOString();
  await supabase
    .from("canonical_sentence_translations")
    .update({
      status: "stale",
      stale_at: now,
      stale_reason: input.reason,
      source_fingerprint: input.fingerprint,
      updated_at: now,
    })
    .eq("sentence_id", input.sentenceId)
    .eq("dialect", input.dialect);

  await clearLegacyDialectTranslation(input.legacyId, input.dialect);
}

export async function markCanonicalTranslationsStale(input: {
  sentenceId: string;
  legacyId: string;
  reason: string;
  fingerprint: string;
}): Promise<number> {
  const supabase = createAdminClient();
  if (!supabase) return 0;

  const { data: rows } = await supabase
    .from("canonical_sentence_translations")
    .select("dialect")
    .eq("sentence_id", input.sentenceId);

  let marked = 0;
  for (const row of rows ?? []) {
    await markDialectStale({
      sentenceId: input.sentenceId,
      dialect: row.dialect as Dialect,
      legacyId: input.legacyId,
      reason: input.reason,
      fingerprint: input.fingerprint,
    });
    marked++;
  }
  return marked;
}

/** Compare published English against canonical rows; mark translations stale on change. */
export async function reconcileCanonicalContent(
  seeds: ContentSeed[] = loadContentSeedsFromFiles()
): Promise<ReconcileResult> {
  const supabase = createAdminClient();
  if (!supabase) throw new Error("Supabase admin not configured");

  const result: ReconcileResult = {
    scanned: seeds.length,
    unchanged: 0,
    updated: 0,
    staleMarked: 0,
    created: 0,
  };

  for (const seed of seeds) {
    const fingerprint = contentFingerprint(seed.english);
    const now = new Date().toISOString();
    const metadata = seedToMetadata(seed);
    const source = seed.source === "pathway" ? "pathway" : "premade";

    const { data: existing } = await supabase
      .from("canonical_sentences")
      .select("id, content_fingerprint, content_version")
      .eq("legacy_id", seed.legacyId)
      .maybeSingle();

    if (!existing) {
      const { data, error } = await supabase
        .from("canonical_sentences")
        .insert({
          legacy_id: seed.legacyId,
          english: seed.english,
          content_fingerprint: fingerprint,
          source,
          speaker: seed.speaker === "B" ? "B" : seed.speaker === "A" ? "A" : null,
          metadata,
          content_version: 1,
          updated_at: now,
        })
        .select("id")
        .single();
      if (!error && data) result.created++;
      continue;
    }

    const prevFingerprint = existing.content_fingerprint as string | null;
    if (prevFingerprint === fingerprint) {
      result.unchanged++;
      continue;
    }

    const nextVersion = Number(existing.content_version ?? 1) + 1;
    const { error: updateError } = await supabase
      .from("canonical_sentences")
      .update({
        english: seed.english,
        content_fingerprint: fingerprint,
        metadata,
        content_version: nextVersion,
        updated_at: now,
      })
      .eq("id", existing.id);

    if (updateError) continue;

    result.updated++;
    result.staleMarked += await markCanonicalTranslationsStale({
      sentenceId: existing.id as string,
      legacyId: seed.legacyId,
      reason: "english_changed",
      fingerprint,
    });
  }

  return result;
}

async function listStaleRows(limit: number): Promise<StaleRow[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("canonical_sentence_translations")
    .select(
      "sentence_id, dialect, canonical_sentences!inner(legacy_id, english, speaker, metadata, content_fingerprint)"
    )
    .eq("status", "stale")
    .order("stale_at", { ascending: true })
    .limit(limit);

  const rows: StaleRow[] = [];
  for (const row of data ?? []) {
    const embedded = row.canonical_sentences as
      | {
          legacy_id: string;
          english: string;
          speaker: "A" | "B" | null;
          metadata: Record<string, unknown>;
          content_fingerprint: string;
        }
      | Array<{
          legacy_id: string;
          english: string;
          speaker: "A" | "B" | null;
          metadata: Record<string, unknown>;
          content_fingerprint: string;
        }>
      | null;
    const sentence = Array.isArray(embedded) ? embedded[0] : embedded;
    if (!sentence?.legacy_id || !sentence.english) continue;
    rows.push({
      sentence_id: row.sentence_id as string,
      dialect: row.dialect as Dialect,
      legacy_id: sentence.legacy_id,
      english: sentence.english,
      speaker: sentence.speaker,
      metadata: sentence.metadata ?? {},
      content_fingerprint: sentence.content_fingerprint,
    });
  }
  return rows;
}

function seedFromStaleRow(row: StaleRow): ContentSeed {
  const md = row.metadata;
  return {
    legacyId: row.legacy_id,
    english: row.english,
    source: row.legacy_id.startsWith("premade_") ? "premade" : "pathway",
    speaker: row.speaker === "B" ? "B" : row.speaker === "A" ? "A" : undefined,
    register: typeof md.register === "string" ? md.register : "polite",
    difficulty: typeof md.difficulty === "number" ? md.difficulty : 1,
    category: typeof md.category === "string" ? md.category : "",
    subtopic: typeof md.subtopic === "string" ? md.subtopic : "",
    tags: Array.isArray(md.tags) ? (md.tags as string[]) : [],
    context_notes:
      typeof md.context_notes === "string" ? md.context_notes : undefined,
  };
}

/** Retranslate stale canonical rows and enqueue fresh TTS. */
export async function processStaleTranslationsBatch(
  limit = 20
): Promise<StaleProcessResult> {
  const result: StaleProcessResult = {
    attempted: 0,
    retranslated: 0,
    failed: 0,
    skipped: 0,
  };

  if (!isOpenAIConfigured()) {
    return result;
  }

  const staleRows = await listStaleRows(limit);
  if (staleRows.length === 0) return result;

  const supabase = createAdminClient();
  if (!supabase) return result;

  const byDialect = new Map<Dialect, StaleRow[]>();
  for (const row of staleRows) {
    if (row.dialect === "kansai" && !KANSAI_FEATURE_ENABLED) {
      result.skipped++;
      continue;
    }
    const list = byDialect.get(row.dialect) ?? [];
    list.push(row);
    byDialect.set(row.dialect, list);
  }

  const openai = getOpenAIClient();

  for (const [dialect, rows] of byDialect) {
    const seeds = rows.map(seedFromStaleRow);
    const prompt = buildTranslationPrompt(
      seeds.map((s) => ({
        id: s.legacyId,
        english: s.english,
        register: s.register ?? "polite",
        difficulty: s.difficulty ?? 1,
        category: s.category ?? "",
        subtopic: s.subtopic ?? "",
        tags: s.tags ?? [],
        context_notes: s.context_notes,
      })),
      dialect
    );

    const systemContent =
      dialect === "kansai"
        ? "You translate English into natural Kansai Japanese for language learners. Return valid JSON only."
        : "You translate English sentences into natural Japanese for language learners. Return valid JSON only.";

    for (const row of rows) {
      result.attempted++;
      await supabase
        .from("canonical_sentence_translations")
        .update({ status: "translating", updated_at: new Date().toISOString() })
        .eq("sentence_id", row.sentence_id)
        .eq("dialect", row.dialect);
    }

    let parsed: ReturnType<typeof translateResponseSchema.parse>;
    try {
      const completion = await openai.chat.completions.create({
        model: getOpenAIModel(),
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: prompt },
        ],
      });
      const raw = completion.choices[0]?.message?.content;
      if (!raw) throw new Error("Empty AI response");
      parsed = translateResponseSchema.parse(JSON.parse(raw));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Retranslate failed";
      for (const row of rows) {
        result.failed++;
        await supabase
          .from("canonical_sentence_translations")
          .update({
            status: "failed",
            stale_reason: message.slice(0, 240),
            updated_at: new Date().toISOString(),
          })
          .eq("sentence_id", row.sentence_id)
          .eq("dialect", row.dialect);
      }
      continue;
    }

    for (const row of rows) {
      const fields = parsed.translations[row.legacy_id];
      if (!fields?.japanese?.trim()) {
        result.failed++;
        await supabase
          .from("canonical_sentence_translations")
          .update({
            status: "failed",
            stale_reason: "missing_translation",
            updated_at: new Date().toISOString(),
          })
          .eq("sentence_id", row.sentence_id)
          .eq("dialect", row.dialect);
        continue;
      }

      const seed = seedFromStaleRow(row);
      const durable = await persistDurableTranslation({
        legacySentenceId: row.legacy_id,
        english: row.english,
        dialect: row.dialect,
        fields,
        scope: "canonical",
        speaker: seed.speaker === "B" ? "B" : "A",
        provenance: "ai",
        metadata: seedToMetadata(seed),
        force: true,
      });

      if (!durable.ok) {
        result.failed++;
        await supabase
          .from("canonical_sentence_translations")
          .update({
            status: "failed",
            stale_reason: durable.error?.slice(0, 240) ?? "persist_failed",
            updated_at: new Date().toISOString(),
          })
          .eq("sentence_id", row.sentence_id)
          .eq("dialect", row.dialect);
        continue;
      }

      await supabase
        .from("canonical_sentence_translations")
        .update({
          status: "ready",
          source_fingerprint: row.content_fingerprint,
          stale_at: null,
          stale_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("sentence_id", row.sentence_id)
        .eq("dialect", row.dialect);

      result.retranslated++;
    }
  }

  return result;
}

export async function countStaleTranslations(): Promise<number> {
  const supabase = createAdminClient();
  if (!supabase) return 0;
  const { count } = await supabase
    .from("canonical_sentence_translations")
    .select("sentence_id", { count: "exact", head: true })
    .eq("status", "stale");
  return count ?? 0;
}
