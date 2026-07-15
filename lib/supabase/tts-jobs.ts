import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Dialect } from "@/lib/constants/dialect";
import type { NarrationSpeaker } from "@/types/sentence";
import type { TtsCacheMode } from "@/lib/audio/tts-config";

export type TtsJobScope = "canonical" | "user";

export type TtsJobRow = {
  id: string;
  idempotency_key: string;
  legacy_sentence_id: string;
  dialect: Dialect;
  speaker: NarrationSpeaker;
  scope: TtsJobScope;
  owner_user_id: string | null;
  canonical_sentence_id: string | null;
  user_sentence_id: string | null;
  spoken_script: string | null;
  cache_mode: TtsCacheMode;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  result_text_hash: string | null;
};

export function buildTtsJobIdempotencyKey(input: {
  scope: TtsJobScope;
  legacySentenceId: string;
  dialect: Dialect;
  speaker: NarrationSpeaker;
  ownerUserId?: string | null;
  spokenScript?: string | null;
  cacheMode?: TtsCacheMode;
}): string {
  const owner = input.scope === "user" ? input.ownerUserId ?? "anon" : "canonical";
  const identity =
    input.cacheMode === "spoken-script" && input.spokenScript
      ? createHash("sha256").update(input.spokenScript).digest("hex")
      : input.legacySentenceId;
  return `${input.scope}:${owner}:${identity}:${input.dialect}:${input.speaker}:${input.cacheMode ?? "sentence"}`;
}

export async function enqueueTtsJob(input: {
  legacySentenceId: string;
  dialect: Dialect;
  speaker?: NarrationSpeaker;
  scope: TtsJobScope;
  ownerUserId?: string | null;
  canonicalSentenceId?: string | null;
  userSentenceId?: string | null;
  spokenScript?: string | null;
  cacheMode?: TtsCacheMode;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: "Supabase not configured" };

  const speaker = input.speaker === "B" ? "B" : "A";
  const idempotency_key = buildTtsJobIdempotencyKey({
    scope: input.scope,
    legacySentenceId: input.legacySentenceId,
    dialect: input.dialect,
    speaker,
    ownerUserId: input.ownerUserId,
    spokenScript: input.spokenScript,
    cacheMode: input.cacheMode,
  });

  const now = new Date().toISOString();
  const { error } = await supabase.from("tts_generation_jobs").upsert(
    {
      idempotency_key,
      legacy_sentence_id: input.legacySentenceId,
      dialect: input.dialect,
      speaker,
      scope: input.scope,
      owner_user_id: input.ownerUserId ?? null,
      canonical_sentence_id: input.canonicalSentenceId ?? null,
      user_sentence_id: input.userSentenceId ?? null,
      spoken_script: input.spokenScript ?? null,
      cache_mode: input.cacheMode ?? "sentence",
      status: "pending",
      available_at: now,
      updated_at: now,
      last_error: null,
    },
    { onConflict: "idempotency_key" }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Lease a batch of pending jobs for a worker. */
export async function claimTtsJobs(
  limit: number,
  leaseOwner: string,
  leaseSeconds = 120
): Promise<TtsJobRow[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const now = new Date();
  const leaseExpires = new Date(now.getTime() + leaseSeconds * 1000).toISOString();
  const nowIso = now.toISOString();

  const { data: candidates, error } = await supabase
    .from("tts_generation_jobs")
    .select("*")
    .in("status", ["pending", "failed"])
    .lte("available_at", nowIso)
    .lt("attempts", 8)
    .order("available_at", { ascending: true })
    .limit(limit);

  if (error || !candidates?.length) return [];

  const claimed: TtsJobRow[] = [];
  for (const row of candidates) {
    const { data, error: updErr } = await supabase
      .from("tts_generation_jobs")
      .update({
        status: "leased",
        lease_owner: leaseOwner,
        lease_expires_at: leaseExpires,
        attempts: (row.attempts ?? 0) + 1,
        updated_at: nowIso,
      })
      .eq("id", row.id)
      .in("status", ["pending", "failed"])
      .select("*")
      .maybeSingle();

    if (!updErr && data) claimed.push(data as TtsJobRow);
  }

  return claimed;
}

export async function completeTtsJob(
  id: string,
  textHash: string
): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase) return;
  await supabase
    .from("tts_generation_jobs")
    .update({
      status: "completed",
      result_text_hash: textHash,
      last_error: null,
      lease_owner: null,
      lease_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function failTtsJob(
  id: string,
  attempts: number,
  maxAttempts: number,
  errorMessage: string,
  options?: { quota?: boolean }
): Promise<void> {
  const supabase = createAdminClient();
  if (!supabase) return;

  const backoffMs = options?.quota
    ? 30 * 60 * 1000
    : Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 60 * 60 * 1000);
  const dead = attempts >= maxAttempts;
  const available_at = new Date(Date.now() + backoffMs).toISOString();

  await supabase
    .from("tts_generation_jobs")
    .update({
      status: dead ? "dead" : "failed",
      last_error: errorMessage.slice(0, 500),
      lease_owner: null,
      lease_expires_at: null,
      available_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function countPendingTtsJobs(): Promise<number> {
  const supabase = createAdminClient();
  if (!supabase) return 0;
  const { count } = await supabase
    .from("tts_generation_jobs")
    .select("id", { count: "exact", head: true })
    .in("status", ["pending", "failed", "leased"]);
  return count ?? 0;
}
