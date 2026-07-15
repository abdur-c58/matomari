import type { Dialect } from "@/lib/constants/dialect";
import type { SentenceDialectTranslations, TranslatedFields } from "@/types/sentence";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/env";

export type SharedTranslationsPayload = {
  translations: Record<string, SentenceDialectTranslations>;
  updatedAt: string;
};

type SharedTranslationRow = {
  sentence_id: string;
  translations: SentenceDialectTranslations;
  updated_at: string;
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

function rowsToPayload(rows: SharedTranslationRow[]): SharedTranslationsPayload {
  const translations: Record<string, SentenceDialectTranslations> = {};
  let updatedAt = new Date(0).toISOString();

  for (const row of rows) {
    if (!row.sentence_id || !row.translations) continue;
    translations[row.sentence_id] = row.translations;
    if (row.updated_at > updatedAt) {
      updatedAt = row.updated_at;
    }
  }

  return { translations, updatedAt };
}

const SHARED_TRANSLATIONS_PAGE_SIZE = 1000;

export async function fetchSharedTranslationsFromDb(
  since?: string | null
): Promise<SharedTranslationsPayload | null> {
  const cfg = getRestConfig();
  if (!cfg) return null;

  const allRows: SharedTranslationRow[] = [];
  let offset = 0;

  while (true) {
    const filters = since
      ? `&updated_at=gt.${encodeURIComponent(since)}`
      : "";
    const query =
      `${cfg.url}/rest/v1/shared_sentence_translations` +
      `?select=sentence_id,translations,updated_at${filters}` +
      `&order=sentence_id.asc` +
      `&limit=${SHARED_TRANSLATIONS_PAGE_SIZE}` +
      `&offset=${offset}`;

    const res = await fetch(query, {
      headers: restHeaders(cfg.key),
      cache: "no-store",
    });

    if (!res.ok) {
      // Table missing / schema cache miss — treat as empty so clients get 200/304, not 503.
      if (res.status === 404 || res.status === 406) {
        return {
          translations: {},
          updatedAt: since ?? new Date(0).toISOString(),
        };
      }
      return null;
    }

    const rows = (await res.json()) as SharedTranslationRow[];
    allRows.push(...rows);

    if (rows.length < SHARED_TRANSLATIONS_PAGE_SIZE) break;
    offset += SHARED_TRANSLATIONS_PAGE_SIZE;
  }

  if (allRows.length === 0) {
    // Incremental poll with no newer rows (or empty table) — empty payload.
    return { translations: {}, updatedAt: since ?? new Date(0).toISOString() };
  }

  return rowsToPayload(allRows);
}

export async function upsertSharedSentenceTranslations(
  updates: Record<string, SentenceDialectTranslations>
): Promise<void> {
  const cfg = getRestConfig();
  if (!cfg || Object.keys(updates).length === 0) return;

  await Promise.all(
    Object.entries(updates).map(async ([sentenceId, incoming]) => {
      const existingRes = await fetch(
        `${cfg.url}/rest/v1/shared_sentence_translations?sentence_id=eq.${encodeURIComponent(sentenceId)}&select=translations`,
        { headers: restHeaders(cfg.key), cache: "no-store" }
      );

      let merged = incoming;
      if (existingRes.ok) {
        const rows = (await existingRes.json()) as { translations: SentenceDialectTranslations }[];
        if (rows[0]?.translations) {
          merged = { ...rows[0].translations, ...incoming };
        }
      }

      const now = new Date().toISOString();
      await fetch(`${cfg.url}/rest/v1/shared_sentence_translations`, {
        method: "POST",
        headers: restHeaders(cfg.key, {
          Prefer: "resolution=merge-duplicates,return=minimal",
        }),
        body: JSON.stringify({
          sentence_id: sentenceId,
          translations: merged,
          updated_at: now,
        }),
      });
    })
  );
}

export async function upsertSharedTranslationBatch(
  batch: Record<string, TranslatedFields>,
  dialect: Dialect
): Promise<void> {
  const updates: Record<string, SentenceDialectTranslations> = {};
  for (const [sentenceId, fields] of Object.entries(batch)) {
    if (!fields.japanese?.trim()) continue;
    updates[sentenceId] = { [dialect]: fields };
  }
  await upsertSharedSentenceTranslations(updates);
}
