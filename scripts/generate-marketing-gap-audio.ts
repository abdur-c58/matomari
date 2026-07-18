/**
 * Generate homepage gap-demo MP3s via Fish Audio.
 * Does not publish to islands/catalog — writes under public/assets/marketing/.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/generate-marketing-gap-audio.ts
 *   ONLY_INDEX=2 npx tsx --env-file=.env.local scripts/generate-marketing-gap-audio.ts
 */

import { mkdir, writeFile, unlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { compileFishAudioScript } from "../lib/audio/fish-audio-cues";
import { getTtsModel, getFishAudioSettings } from "../lib/audio/tts-config";
import {
  getFishAudioApiKey,
  getFishAudioVoiceIdForDialect,
  isFishAudioConfigured,
} from "../lib/env";
import { marketingProblem } from "../lib/constants/marketing";

const OUT_DIR = path.join(process.cwd(), "public", "assets", "marketing");

const PHRASES = marketingProblem.gapDemo.stages.map((stage, index) => ({
  text: stage.real,
  filename: `gap-${String(index + 1).padStart(2, "0")}.mp3`,
  index: index + 1,
}));

async function synthesize(text: string) {
  const apiKey = getFishAudioApiKey();
  if (!apiKey) throw new Error("FISH_AUDIO_API_KEY missing");

  const voiceId = getFishAudioVoiceIdForDialect("standard", "A");
  const settings = getFishAudioSettings();
  // Trailing long-break keeps the final mora from getting clipped.
  const spoken = compileFishAudioScript(text, null, ["long-break"]);

  const res = await fetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      model: getTtsModel(),
    },
    body: JSON.stringify({
      text: spoken,
      ...(voiceId ? { reference_id: voiceId } : {}),
      format: "mp3",
      temperature: Math.min(settings.temperature, 0.6),
      top_p: settings.top_p,
      prosody: {
        speed: Math.min(settings.speed, 0.9),
        volume: settings.volume,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TTS failed (${res.status}): ${body}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

/** Append a short silence so players don't clip the last mora. */
async function writePaddedMp3(outPath: string, buffer: Buffer) {
  const rawPath = outPath.replace(/\.mp3$/, ".raw.mp3");
  await writeFile(rawPath, buffer);

  const padded = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      rawPath,
      "-af",
      "apad=pad_dur=0.4",
      "-codec:a",
      "libmp3lame",
      "-q:a",
      "4",
      outPath,
    ],
    { encoding: "utf8" }
  );

  if (padded.status !== 0) {
    console.warn("  ffmpeg pad unavailable; writing raw TTS");
    await writeFile(outPath, buffer);
  }

  await unlink(rawPath).catch(() => undefined);
}

async function main() {
  if (!isFishAudioConfigured()) {
    throw new Error("Fish Audio is not configured in .env.local");
  }

  await mkdir(OUT_DIR, { recursive: true });

  const onlyIndex = process.env.ONLY_INDEX
    ? Number.parseInt(process.env.ONLY_INDEX, 10)
    : null;

  for (const phrase of PHRASES) {
    if (onlyIndex !== null && phrase.index !== onlyIndex) continue;

    console.log(`[${phrase.index}] ${phrase.text}`);
    const buffer = await synthesize(phrase.text);
    const outPath = path.join(OUT_DIR, phrase.filename);
    await writePaddedMp3(outPath, buffer);
    console.log(`  → ${phrase.filename} (${buffer.byteLength} bytes raw + pad)`);
  }

  console.log("Done. Homepage-only gap audio; not added to any island.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
