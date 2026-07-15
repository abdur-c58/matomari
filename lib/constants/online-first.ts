/**
 * Online-first cloud mode.
 * When enabled:
 * - Bootstrap prefers cloud revisions while online
 * - Translation success requires durable DB write
 * - Sync pulls before pushing; audio sync does not bulk-generate TTS
 * - Playback streams from cloud unless a package is downloaded
 */
export const ONLINE_FIRST_ENABLED =
  process.env.NEXT_PUBLIC_ONLINE_FIRST !== "0" &&
  process.env.ONLINE_FIRST !== "0";
