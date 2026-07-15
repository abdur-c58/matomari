import { createHash } from "crypto";
import type { Dialect } from "@/lib/constants/dialect";
import type { NarrationSpeaker } from "@/types/sentence";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AudioMetadataRow {
  text_hash: string;
  sentence_id: string;
  r2_key: string;
  created_at: string;
  dialect?: string;
  speaker?: string;
  script_hash?: string | null;
  byte_size?: number | null;
  checksum?: string | null;
  generation_status?: string;
  scope?: string;
  owner_user_id?: string | null;
  updated_at?: string;
}

export type UpsertAudioMetadataInput = {
  textHash: string;
  sentenceId: string;
  r2Key: string;
  dialect?: Dialect;
  speaker?: NarrationSpeaker;
  spokenScript?: string;
  byteSize?: number;
  scope?: "canonical" | "user";
  ownerUserId?: string | null;
  canonicalSentenceId?: string | null;
  userSentenceId?: string | null;
  generationStatus?: "ready" | "pending" | "failed";
};

function getRestConfig(): { url: string; key: string } | null {
  const url = getSupabaseUrl();
  const key = getSupabaseSecretKey();
  if (!url || !key) return null;
  return { url, key };
}

function restHeaders(key: string, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export function checksumBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function scriptHash(spokenScript: string): string {
  return createHash("sha256").update(spokenScript).digest("hex").slice(0, 32);
}

export async function listAudioMetadata(): Promise<AudioMetadataRow[]> {
  const cfg = getRestConfig();
  if (!cfg) return [];

  const res = await fetch(`${cfg.url}/rest/v1/audio_metadata?select=*`, {
    headers: restHeaders(cfg.key),
  });
  if (!res.ok) return [];
  return (await res.json()) as AudioMetadataRow[];
}

export async function deleteAllAudioMetadata(): Promise<void> {
  const cfg = getRestConfig();
  if (!cfg) return;

  await fetch(`${cfg.url}/rest/v1/audio_metadata?text_hash=not.is.null`, {
    method: "DELETE",
    headers: restHeaders(cfg.key, { Prefer: "return=minimal" }),
  });
}

export async function deleteAudioMetadataBySentenceIds(
  sentenceIds: string[]
): Promise<number> {
  const cfg = getRestConfig();
  if (!cfg || sentenceIds.length === 0) return 0;

  let deleted = 0;
  const chunkSize = 40;
  for (let i = 0; i < sentenceIds.length; i += chunkSize) {
    const chunk = sentenceIds.slice(i, i + chunkSize);
    const filter = chunk.map((id) => `"${id.replace(/"/g, "")}"`).join(",");
    const res = await fetch(
      `${cfg.url}/rest/v1/audio_metadata?sentence_id=in.(${filter})`,
      {
        method: "DELETE",
        headers: restHeaders(cfg.key, { Prefer: "return=representation" }),
      }
    );
    if (!res.ok) continue;
    const rows = (await res.json()) as AudioMetadataRow[];
    deleted += Array.isArray(rows) ? rows.length : 0;
  }
  return deleted;
}

export async function upsertAudioMetadata(
  textHash: string,
  sentenceId: string,
  r2Key: string,
  extra?: Omit<UpsertAudioMetadataInput, "textHash" | "sentenceId" | "r2Key">
): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const row = {
    text_hash: textHash,
    sentence_id: sentenceId,
    r2_key: r2Key,
    created_at: now,
    updated_at: now,
    dialect: extra?.dialect ?? "standard",
    speaker: extra?.speaker === "B" ? "B" : "A",
    script_hash: extra?.spokenScript ? scriptHash(extra.spokenScript) : null,
    byte_size: extra?.byteSize ?? null,
    checksum: null as string | null,
    generation_status: extra?.generationStatus ?? "ready",
    scope: extra?.scope ?? "canonical",
    owner_user_id: extra?.ownerUserId ?? null,
    canonical_sentence_id: extra?.canonicalSentenceId ?? null,
    user_sentence_id: extra?.userSentenceId ?? null,
  };

  if (supabase) {
    const { error } = await supabase.from("audio_metadata").upsert(row, {
      onConflict: "text_hash",
    });
    if (!error) return;
  }

  // Fallback REST
  const cfg = getRestConfig();
  if (!cfg) return;
  await fetch(`${cfg.url}/rest/v1/audio_metadata`, {
    method: "POST",
    headers: restHeaders(cfg.key, {
      Prefer: "resolution=merge-duplicates,return=minimal",
    }),
    body: JSON.stringify(row),
  });
}

export async function upsertAudioMetadataFull(
  input: UpsertAudioMetadataInput & { checksum?: string }
): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const row = {
    text_hash: input.textHash,
    sentence_id: input.sentenceId,
    r2_key: input.r2Key,
    created_at: now,
    updated_at: now,
    dialect: input.dialect ?? "standard",
    speaker: input.speaker === "B" ? "B" : "A",
    script_hash: input.spokenScript ? scriptHash(input.spokenScript) : null,
    byte_size: input.byteSize ?? null,
    checksum: input.checksum ?? null,
    generation_status: input.generationStatus ?? "ready",
    scope: input.scope ?? "canonical",
    owner_user_id: input.ownerUserId ?? null,
    canonical_sentence_id: input.canonicalSentenceId ?? null,
    user_sentence_id: input.userSentenceId ?? null,
  };

  if (!supabase) {
    await upsertAudioMetadata(input.textHash, input.sentenceId, input.r2Key, input);
    return;
  }

  const { error } = await supabase.from("audio_metadata").upsert(row, {
    onConflict: "text_hash",
  });
  if (error) {
    throw new Error(`audio_metadata upsert failed: ${error.message}`);
  }

  const { error: bindingError } = await supabase
    .from("audio_sentence_bindings")
    .upsert(
      {
        text_hash: input.textHash,
        sentence_id: input.sentenceId,
        dialect: input.dialect ?? "standard",
        speaker: input.speaker === "B" ? "B" : "A",
      },
      { onConflict: "text_hash,sentence_id,dialect,speaker" }
    );
  if (bindingError) {
    throw new Error(`audio sentence binding upsert failed: ${bindingError.message}`);
  }
}

export async function getAudioMetadataByTextHash(
  textHash: string
): Promise<AudioMetadataRow | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("audio_metadata")
    .select("*")
    .eq("text_hash", textHash)
    .maybeSingle();
  return (data as AudioMetadataRow | null) ?? null;
}

export async function listAudioMetadataForSentenceIds(
  sentenceIds: string[]
): Promise<AudioMetadataRow[]> {
  const supabase = createAdminClient();
  if (!supabase || sentenceIds.length === 0) return [];

  const out: AudioMetadataRow[] = [];
  const chunkSize = 80;
  for (let i = 0; i < sentenceIds.length; i += chunkSize) {
    const chunk = sentenceIds.slice(i, i + chunkSize);
    const { data: bindings } = await supabase
      .from("audio_sentence_bindings")
      .select("text_hash, sentence_id, dialect, speaker")
      .in("sentence_id", chunk);

    if (bindings?.length) {
      const hashes = [...new Set(bindings.map((binding) => binding.text_hash))];
      const { data: metadata } = await supabase
        .from("audio_metadata")
        .select("*")
        .in("text_hash", hashes)
        .eq("generation_status", "ready");
      const byHash = new Map(
        (metadata ?? []).map((row) => [row.text_hash as string, row as AudioMetadataRow])
      );
      for (const binding of bindings) {
        const meta = byHash.get(binding.text_hash);
        if (!meta) continue;
        out.push({
          ...meta,
          sentence_id: binding.sentence_id,
          dialect: binding.dialect,
          speaker: binding.speaker,
        });
      }
    }

    // Backward compatibility for assets created before audio_sentence_bindings.
    const { data: legacy } = await supabase
      .from("audio_metadata")
      .select("*")
      .in("sentence_id", chunk)
      .eq("generation_status", "ready");
    if (legacy?.length) {
      const existing = new Set(
        out.map((row) => `${row.text_hash}:${row.sentence_id}:${row.dialect}:${row.speaker}`)
      );
      for (const row of legacy as AudioMetadataRow[]) {
        const key = `${row.text_hash}:${row.sentence_id}:${row.dialect}:${row.speaker}`;
        if (!existing.has(key)) out.push(row);
      }
    }
  }
  return out;
}
