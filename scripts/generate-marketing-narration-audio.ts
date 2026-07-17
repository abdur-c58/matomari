/**
 * Generate homepage-only narration demo MP3s via Fish Audio.
 * Does not publish to islands/catalog — writes under public/assets/marketing/.
 *
 * Usage: npx tsx --env-file=.env.local scripts/generate-marketing-narration-audio.ts
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  combineParalinguisticTags,
  compileFishAudioScript,
} from "../lib/audio/fish-audio-cues";
import { getTtsModel, getFishAudioSettings } from "../lib/audio/tts-config";
import {
  getFishAudioApiKey,
  getFishAudioVoiceIdForDialect,
  isFishAudioConfigured,
} from "../lib/env";
import { marketingNarrationBatch } from "../lib/constants/marketing-narration";

const OUT_DIR = path.join(
  process.cwd(),
  "public",
  "assets",
  "marketing"
);

async function synthesize(text: string, speaker: "A" | "B") {
  const apiKey = getFishAudioApiKey();
  if (!apiKey) throw new Error("FISH_AUDIO_API_KEY missing");

  const voiceId = getFishAudioVoiceIdForDialect("standard", speaker);
  const settings = getFishAudioSettings();

  const res = await fetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      model: getTtsModel(),
    },
    body: JSON.stringify({
      text,
      ...(voiceId ? { reference_id: voiceId } : {}),
      format: "mp3",
      temperature: settings.temperature,
      top_p: settings.top_p,
      prosody: {
        speed: settings.speed,
        volume: settings.volume,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TTS failed for speaker ${speaker} (${res.status}): ${body}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  if (!isFishAudioConfigured()) {
    throw new Error("Fish Audio is not configured in .env.local");
  }

  await mkdir(OUT_DIR, { recursive: true });

  const tone = marketingNarrationBatch.narrationMode.toneTags;

  for (const [index, sentence] of marketingNarrationBatch.sentences.entries()) {
    const onlyIndex = process.env.ONLY_INDEX
      ? Number.parseInt(process.env.ONLY_INDEX, 10)
      : null;
    if (onlyIndex !== null && index + 1 !== onlyIndex) continue;

    const tags = combineParalinguisticTags(
      [...tone],
      [...sentence.paralinguisticTags]
    );
    const spoken = compileFishAudioScript(sentence.japanese, null, tags);
    const filename = `narration-${String(index + 1).padStart(2, "0")}.mp3`;
    const outPath = path.join(OUT_DIR, filename);

    console.log(`[${sentence.speaker}] ${spoken}`);
    const buffer = await synthesize(spoken, sentence.speaker);
    await writeFile(outPath, buffer);
    console.log(`  → ${filename} (${buffer.byteLength} bytes)`);
  }

  console.log("Done. Homepage-only assets written; not added to any island.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
