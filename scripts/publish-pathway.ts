/**
 * Publish the canonical main pathway for all users.
 *
 * Usage:
 *   npm run publish-pathway
 *   npm run publish-pathway -- path/to/dataset.json
 */

import fs from "fs";
import type { Dataset } from "../types/sentence";
import { parseDataset } from "../lib/validation/dataset-schema";
import { publishSharedPathwayToDb } from "../lib/supabase/shared-pathway-data";
import { reconcileCanonicalContent } from "../lib/cloud/sentence-invalidation";

async function loadDatasetFromSupabase(): Promise<Dataset | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const res = await fetch(
    `${url}/rest/v1/user_datasets?select=data&order=updated_at.desc&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    }
  );

  if (!res.ok) return null;
  const rows = (await res.json()) as { data: unknown }[];
  if (!rows[0]?.data) return null;
  return parseDataset(rows[0].data);
}

async function main() {
  const fileArg = process.argv[2];
  let dataset: Dataset | null = null;

  if (fileArg && fs.existsSync(fileArg)) {
    dataset = parseDataset(JSON.parse(fs.readFileSync(fileArg, "utf8")));
    console.log(`Loaded dataset from ${fileArg}`);
  } else {
    dataset = await loadDatasetFromSupabase();
    if (dataset) {
      console.log("Loaded dataset from Supabase (most recent user_datasets row)");
    }
  }

  if (!dataset?.main_pathway?.batches?.length) {
    console.error(
      "No pathway found. Pass a JSON file with main_pathway.batches or ensure Supabase has data."
    );
    process.exit(1);
  }

  const batchCount = dataset.main_pathway.batches.length;
  const sentenceCount = dataset.main_pathway.batches.reduce(
    (n, b) => n + b.sentences.length,
    0
  );

  console.log(`Publishing ${batchCount} batches (${sentenceCount} sentences)…`);

  const outPath = "public/main-pathway.json";
  fs.writeFileSync(outPath, JSON.stringify({ main_pathway: dataset.main_pathway }, null, 2));
  console.log(`Wrote fallback file: ${outPath}`);

  const ok = await publishSharedPathwayToDb(dataset.main_pathway);
  if (!ok) {
    console.warn(
      "Supabase publish failed — run supabase/migrations/002_shared_pathway.sql in the SQL Editor."
    );
    console.log("The app will still serve the pathway from public/main-pathway.json.");
    process.exit(0);
  }

  console.log("Done. Shared pathway live in Supabase and public/main-pathway.json");

  const reconcile = await reconcileCanonicalContent();
  console.log("Reconciled canonical content:", reconcile);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
