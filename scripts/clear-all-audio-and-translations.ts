/**
 * Wipe all TTS audio and all translations (standard + Kansai) everywhere:
 * - R2 + Supabase audio_metadata + local audio cache
 * - Shared main pathway (Supabase + public/main-pathway.json)
 * - Every user_datasets row (island sentences + sentenceTranslations)
 *
 * Usage:
 *   npm run clear-all-audio-and-translations
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 */

import fs from "fs";
import path from "path";
import type { Dataset } from "../types/sentence";
import { clearAudioCaches } from "../lib/audio/regenerate-all-audio";
import {
  stripAllTranslationsFromLibrary,
  stripTranslationsFromPathway,
} from "../lib/services/dialect-translation-service";
import {
  fetchSharedPathwayFromDb,
  publishSharedPathwayToDb,
} from "../lib/supabase/shared-pathway-data";
import {
  isLegacyFullDataset,
  normalizeStoredLibrary,
} from "../lib/services/shared-pathway-service";
import { parseDataset } from "../lib/validation/dataset-schema";

type UserDatasetRow = {
  user_id: string;
  data: unknown;
  updated_at: string;
  imported_at?: string;
};

function getRestConfig(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local"
    );
  }

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

async function fetchAllUserDatasets(
  cfg: { url: string; key: string }
): Promise<UserDatasetRow[]> {
  const res = await fetch(
    `${cfg.url}/rest/v1/user_datasets?select=user_id,data,updated_at,imported_at`,
    { headers: restHeaders(cfg.key) }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch user_datasets (${res.status}): ${body}`);
  }

  return (await res.json()) as UserDatasetRow[];
}

async function upsertUserLibrary(
  cfg: { url: string; key: string },
  row: UserDatasetRow,
  data: unknown
): Promise<void> {
  const now = new Date().toISOString();
  const res = await fetch(`${cfg.url}/rest/v1/user_datasets`, {
    method: "POST",
    headers: restHeaders(cfg.key, {
      Prefer: "resolution=merge-duplicates,return=minimal",
    }),
    body: JSON.stringify({
      user_id: row.user_id,
      data,
      updated_at: now,
      imported_at: row.imported_at ?? now,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Failed to upsert user_datasets for ${row.user_id} (${res.status}): ${body}`
    );
  }
}

function countTranslatedPathwaySentences(main_pathway: Dataset["main_pathway"]): number {
  return main_pathway.batches.reduce(
    (n, batch) =>
      n + batch.sentences.filter((s) => s.translated || Boolean(s.japanese?.trim())).length,
    0
  );
}

function countIslandTranslatedSentences(data: unknown): number {
  if (!data || typeof data !== "object") return 0;

  const islands =
    "islands" in data
      ? (data as { islands: Dataset["islands"] }).islands
      : null;
  if (!islands) return 0;

  let count = 0;
  for (const island of Object.values(islands)) {
    for (const sentence of island.sentences) {
      if (sentence.translated || Boolean(sentence.japanese?.trim())) {
        count++;
      }
    }
  }
  return count;
}

function countSentenceTranslations(data: unknown): number {
  if (!data || typeof data !== "object" || !("sentenceTranslations" in data)) {
    return 0;
  }

  const translations = (data as { sentenceTranslations?: Record<string, unknown> })
    .sentenceTranslations;
  return translations ? Object.keys(translations).length : 0;
}

async function loadPathwayForStrip(): Promise<Dataset["main_pathway"] | null> {
  const fromDb = await fetchSharedPathwayFromDb();
  if (fromDb?.main_pathway?.batches?.length) {
    return fromDb.main_pathway;
  }

  const fallbackPath = path.join(process.cwd(), "public", "main-pathway.json");
  if (!fs.existsSync(fallbackPath)) return null;

  const parsed = parseDataset(JSON.parse(fs.readFileSync(fallbackPath, "utf8")));
  return parsed.main_pathway?.batches?.length ? parsed.main_pathway : null;
}

async function main() {
  console.log("=== Clearing all audio ===\n");
  const { deletedR2 } = await clearAudioCaches();
  console.log(`Removed ${deletedR2} R2 object(s) and all audio_metadata rows.\n`);

  console.log("=== Clearing all translations (standard + Kansai) ===\n");

  const pathway = await loadPathwayForStrip();
  if (pathway) {
    const before = countTranslatedPathwaySentences(pathway);
    const stripped = stripTranslationsFromPathway(pathway);
    const outPath = path.join(process.cwd(), "public", "main-pathway.json");
    fs.writeFileSync(outPath, JSON.stringify({ main_pathway: stripped }, null, 2));
    console.log(`Shared pathway: stripped ${before} translated sentence(s)`);
    console.log(`Wrote ${outPath}`);

    const published = await publishSharedPathwayToDb(stripped);
    console.log(
      published
        ? "Published stripped pathway to Supabase shared_pathway."
        : "Warning: Supabase shared_pathway publish failed (local file updated)."
    );
  } else {
    console.log("No shared pathway found in Supabase or public/main-pathway.json.");
  }

  const cfg = getRestConfig();
  const rows = await fetchAllUserDatasets(cfg);
  console.log(`\nProcessing ${rows.length} user_datasets row(s)…\n`);

  let usersUpdated = 0;
  let islandSentencesStripped = 0;
  let translationEntriesCleared = 0;

  for (const row of rows) {
    const library = normalizeStoredLibrary(row.data);
    if (!library && !isLegacyFullDataset(row.data)) {
      console.log(`  ${row.user_id}: skipped (unrecognized library shape)`);
      continue;
    }

    const islandBefore = countIslandTranslatedSentences(row.data);
    const translationsBefore = countSentenceTranslations(row.data);

    const cleaned = stripAllTranslationsFromLibrary(
      library ?? { islands: (row.data as Dataset).islands ?? {} }
    );

    if (islandBefore === 0 && translationsBefore === 0) {
      console.log(`  ${row.user_id}: already clean`);
      continue;
    }

    await upsertUserLibrary(cfg, row, cleaned);
    usersUpdated++;
    islandSentencesStripped += islandBefore;
    translationEntriesCleared += translationsBefore;
    console.log(
      `  ${row.user_id}: stripped ${islandBefore} island sentence(s), cleared ${translationsBefore} translation map entr${translationsBefore === 1 ? "y" : "ies"}`
    );
  }

  console.log("\nDone.");
  console.log(`  Audio: R2 objects removed: ${deletedR2}`);
  console.log(`  Users updated: ${usersUpdated}`);
  console.log(`  Island sentences stripped: ${islandSentencesStripped}`);
  console.log(`  sentenceTranslations entries cleared: ${translationEntriesCleared}`);
  console.log(
    "\nNext: open Kotoshima, Sync now, then Translate all / regenerate audio as needed."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
