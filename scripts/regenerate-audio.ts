/**
 * Wipe R2 audio + metadata and regenerate all sentence TTS with current ElevenLabs settings.
 *
 * Usage:
 *   npm run regenerate-audio
 *   npm run regenerate-audio -- path/to/dataset.json
 */

import fs from "fs";
import type { Dataset } from "../types/sentence";
import { parseDataset } from "../lib/validation/dataset-schema";
import { regenerateAllAudio } from "../lib/audio/regenerate-all-audio";

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
    if (dataset) console.log("Loaded dataset from Supabase (most recent user_datasets row)");
  }

  if (!dataset) {
    console.error(
      "No dataset found. Pass a JSON file path or ensure Supabase user_datasets has data."
    );
    process.exit(1);
  }

  console.log("Clearing old R2 audio and regenerating with current voice settings…\n");

  const result = await regenerateAllAudio(dataset, (completed, total, id) => {
    if (completed === 0 || completed % 5 === 0 || completed === total) {
      process.stdout.write(`\r[${completed}/${total}] ${id}          `);
    }
  });

  console.log("\n\nDone.");
  console.log(JSON.stringify(result, null, 2));

  if (result.quotaExceeded || result.failed > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
