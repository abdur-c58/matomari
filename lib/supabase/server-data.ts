import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/env";

export interface AudioMetadataRow {
  text_hash: string;
  sentence_id: string;
  r2_key: string;
  created_at: string;
}

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

export async function upsertAudioMetadata(
  textHash: string,
  sentenceId: string,
  r2Key: string
): Promise<void> {
  const cfg = getRestConfig();
  if (!cfg) return;

  await fetch(`${cfg.url}/rest/v1/audio_metadata`, {
    method: "POST",
    headers: restHeaders(cfg.key, {
      Prefer: "resolution=merge-duplicates,return=minimal",
    }),
    body: JSON.stringify({
      text_hash: textHash,
      sentence_id: sentenceId,
      r2_key: r2Key,
      created_at: new Date().toISOString(),
    }),
  });
}
