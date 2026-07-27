/**
 * Clear cached TTS audio (R2 + metadata) for narration scene sentence IDs only.
 * Pair with STANDARD_TTS_CACHE_VERSION bump after Fish cue rollout.
 *
 * Usage: npx tsx --env-file=.env.local scripts/clear-narration-audio.ts
 */

import fs from "fs";
import path from "path";
import { clearAudioCachesForSentenceIds } from "../lib/audio/regenerate-all-audio";
import { parsePremadeCatalog } from "../lib/validation/premade-catalog-schema";

async function main() {
  const catalogPath = path.join(process.cwd(), "public", "premade-catalog.json");
  const catalog = parsePremadeCatalog(
    JSON.parse(fs.readFileSync(catalogPath, "utf8"))
  );

  const ids = new Set<string>();
  for (const scene of Object.values(catalog.scenes)) {
    if (scene.format !== "narration") continue;
    for (const s of scene.sentences) ids.add(s.id);
  }

  if (ids.size === 0) {
    console.log("No narration sentence IDs found.");
    return;
  }

  console.log(`Clearing audio for ${ids.size} narration sentence id(s)…`);
  const { deletedR2, deletedMetadata } = await clearAudioCachesForSentenceIds([
    ...ids,
  ]);
  console.log(
    `Done. Removed ${deletedR2} R2 object(s), ${deletedMetadata} metadata row(s).`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
