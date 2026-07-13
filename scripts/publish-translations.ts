/**
 * Publish canonical translations for all users.
 *
 * 1. Bakes standard translations into the shared main pathway (everyone gets them on load).
 * 2. Copies your full sentenceTranslations map to every user_datasets row (standard + Kansai).
 *
 * Usage:
 *   npm run publish-translations
 *   npm run publish-translations -- --user-id=<supabase-user-uuid>
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 */

import fs from "fs";
import path from "path";
import type { Dataset, SentenceDialectTranslations, UserLibrary } from "../types/sentence";
import { applyTranslation } from "../lib/sentence-utils";
import { mergeSentenceTranslations } from "../lib/services/dialect-translation-service";
import { normalizeStoredLibrary } from "../lib/services/shared-pathway-service";
import { publishSharedPathwayToDb, fetchSharedPathwayFromDb } from "../lib/supabase/shared-pathway-data";
import { upsertSharedSentenceTranslations } from "../lib/supabase/shared-translations-data";
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

function parseUserIdArg(): string | undefined {
  const flag = process.argv.find((arg) => arg.startsWith("--user-id="));
  return flag?.slice("--user-id=".length).trim() || undefined;
}

async function fetchAllUserDatasets(cfg: { url: string; key: string }): Promise<UserDatasetRow[]> {
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
  data: UserLibrary
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

function countTranslations(
  translations: Record<string, SentenceDialectTranslations> | undefined
): number {
  if (!translations) return 0;
  let count = 0;
  for (const entry of Object.values(translations)) {
    if (entry.standard?.japanese?.trim()) count++;
    if (entry.kansai?.japanese?.trim()) count++;
  }
  return count;
}

function pickSourceRow(
  rows: UserDatasetRow[],
  userId?: string
): { row: UserDatasetRow; translations: Record<string, SentenceDialectTranslations> } {
  if (userId) {
    const row = rows.find((r) => r.user_id === userId);
    if (!row) {
      throw new Error(`No user_datasets row found for user_id=${userId}`);
    }
    const library = normalizeStoredLibrary(row.data);
    const translations = library?.sentenceTranslations ?? {};
    if (Object.keys(translations).length === 0) {
      throw new Error(`User ${userId} has no sentenceTranslations to publish`);
    }
    return { row, translations };
  }

  let best: { row: UserDatasetRow; translations: Record<string, SentenceDialectTranslations>; score: number } | null =
    null;

  for (const row of rows) {
    const library = normalizeStoredLibrary(row.data);
    const translations = library?.sentenceTranslations;
    const score = countTranslations(translations);
    if (score === 0) continue;
    if (!best || score > best.score) {
      best = { row, translations: translations!, score };
    }
  }

  if (!best) {
    throw new Error(
      "No sentenceTranslations found in any user_datasets row. Translate on your account, sync, then run again."
    );
  }

  return { row: best.row, translations: best.translations };
}

async function loadPathway(): Promise<Dataset["main_pathway"]> {
  const fromDb = await fetchSharedPathwayFromDb();
  if (fromDb?.main_pathway?.batches?.length) {
    return fromDb.main_pathway;
  }

  const fallbackPath = path.join(process.cwd(), "public", "main-pathway.json");
  if (!fs.existsSync(fallbackPath)) {
    throw new Error("No shared pathway found in Supabase or public/main-pathway.json");
  }

  const parsed = parseDataset(JSON.parse(fs.readFileSync(fallbackPath, "utf8")));
  if (!parsed.main_pathway?.batches?.length) {
    throw new Error("main-pathway.json has no batches");
  }
  return parsed.main_pathway;
}

function bakeStandardIntoPathway(
  main_pathway: Dataset["main_pathway"],
  translations: Record<string, SentenceDialectTranslations>
): { pathway: Dataset["main_pathway"]; count: number } {
  let count = 0;

  const pathway = {
    ...main_pathway,
    batches: main_pathway.batches.map((batch) => ({
      ...batch,
      sentences: batch.sentences.map((sentence) => {
        const fields = translations[sentence.id]?.standard;
        if (!fields?.japanese?.trim()) return sentence;
        count++;
        return applyTranslation(sentence, fields);
      }),
    })),
  };

  return { pathway, count };
}

async function main() {
  const cfg = getRestConfig();
  const rows = await fetchAllUserDatasets(cfg);
  if (rows.length === 0) {
    throw new Error("No user_datasets rows found.");
  }

  const userId = parseUserIdArg();
  const { row: sourceRow, translations } = pickSourceRow(rows, userId);

  const standardCount = Object.values(translations).filter((e) =>
    Boolean(e.standard?.japanese?.trim())
  ).length;
  const kansaiCount = Object.values(translations).filter((e) =>
    Boolean(e.kansai?.japanese?.trim())
  ).length;

  console.log(`Source user: ${sourceRow.user_id}`);
  console.log(
    `Translations: ${Object.keys(translations).length} sentence(s) (${standardCount} standard, ${kansaiCount} kansai)\n`
  );

  console.log("=== Publishing standard translations into shared pathway ===\n");
  const basePathway = await loadPathway();
  const { pathway, count: bakedCount } = bakeStandardIntoPathway(basePathway, translations);

  const outPath = path.join(process.cwd(), "public", "main-pathway.json");
  fs.writeFileSync(outPath, JSON.stringify({ main_pathway: pathway }, null, 2));
  console.log(`Baked ${bakedCount} standard sentence(s) into ${outPath}`);

  const published = await publishSharedPathwayToDb(pathway);
  console.log(
    published
      ? "Published pathway to Supabase shared_pathway."
      : "Warning: Supabase shared_pathway publish failed (local file updated)."
  );

  console.log("\n=== Publishing to shared_sentence_translations ===\n");
  await upsertSharedSentenceTranslations(translations);
  console.log(`Upserted ${Object.keys(translations).length} sentence(s) to shared pool.`);

  console.log("\n=== Copying sentenceTranslations to all users ===\n");

  let usersUpdated = 0;
  for (const row of rows) {
    const library = normalizeStoredLibrary(row.data) ?? { islands: {} };
    const merged = mergeSentenceTranslations(
      library.sentenceTranslations,
      translations
    );

    const before = countTranslations(library.sentenceTranslations);
    const after = countTranslations(merged);
    if (after <= before && row.user_id !== sourceRow.user_id) {
      console.log(`  ${row.user_id}: already up to date`);
      continue;
    }

    await upsertUserLibrary(cfg, row, {
      ...library,
      sentenceTranslations: merged,
    });
    usersUpdated++;
    console.log(`  ${row.user_id}: ${before} → ${after} translation field(s)`);
  }

  console.log("\nDone.");
  console.log(`  Pathway standard sentences: ${bakedCount}`);
  console.log(`  Users updated: ${usersUpdated}`);
  console.log(
    "\nFriends should open Kotoshima and tap Sync now (or hard-refresh) to pull the shared translations."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
