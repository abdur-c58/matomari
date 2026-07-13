/**
 * Remove all sentenceTranslations for every user in Supabase.
 * This resets all translations (standard + dialects) so the user can retranslate all from scratch.
 *
 * Usage:
 *   npm run clear-all-translations
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 */

import { normalizeStoredLibrary } from "../lib/services/shared-pathway-service";

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

async function main() {
  const cfg = getRestConfig();
  const rows = await fetchAllUserDatasets(cfg);

  if (rows.length === 0) {
    console.log("No user_datasets rows found.");
    return;
  }

  console.log(`Found ${rows.length} user_datasets row(s).\n`);

  let totalReset = 0;
  let usersUpdated = 0;

  for (const row of rows) {
    const library = normalizeStoredLibrary(row.data);
    if (!library) {
      console.log(`  ${row.user_id}: skipped (unrecognized library shape)`);
      continue;
    }

    const originalCount = library.sentenceTranslations ? Object.keys(library.sentenceTranslations).length : 0;
    if (originalCount === 0) {
      console.log(`  ${row.user_id}: no translations to clear`);
      continue;
    }

    const cleaned = {
      ...library,
      sentenceTranslations: undefined,
    };

    await upsertUserLibrary(cfg, row, cleaned);
    totalReset += originalCount;
    usersUpdated++;
    console.log(`  ${row.user_id}: cleared all ${originalCount} translation(s)`);
  }

  console.log("\nDone.");
  console.log(`  Users updated: ${usersUpdated}`);
  console.log(`  Translations cleared: ${totalReset}`);
  console.log(
    "\nNext: open Kotoshima, Sync now, then click 'Translate all' to retranslate sentences."
  );
}
// main
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
