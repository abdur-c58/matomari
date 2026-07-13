/**
 * Wipe all cached TTS audio (R2 + Supabase metadata + local fs cache).
 * Standard audio is invalidated by cache version bump; this removes orphaned files.
 *
 * Usage: npm run clear-standard-audio
 */

import { clearAudioCaches } from "../lib/audio/regenerate-all-audio";

async function main() {
  console.log("Clearing all cached TTS audio (standard + kansai)…\n");
  const { deletedR2 } = await clearAudioCaches();
  console.log(`Done. Removed ${deletedR2} R2 object(s) and all audio_metadata rows.`);
  console.log(
    "Regenerate with: npm run regenerate-audio (requires FISH_AUDIO_API_KEY + R2)."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
