/**
 * Provider-agnostic TTS tuning for Fish Audio — see .env.example for guidance.
 *
 * Fish Audio (s2.1-pro-free by default) reads Japanese kanji surface with correct pitch accent
 * and intonation, so tuning here stays light:
 *   temperature: higher = more expressive/variable delivery
 *   top_p:       nucleus sampling diversity
 *   speed:       1.0 = normal; slightly lower can help learners shadow
 *   volume:      loudness offset in dB (0 = unchanged)
 */

import { getFishAudioModel, getFishAudioVoiceIdForDialect } from "@/lib/env";
import type { Dialect } from "@/lib/constants/dialect";

/** Bumped when switching TTS engine/settings so cached audio regenerates. */
const STANDARD_TTS_CACHE_VERSION = "fish-s21-free-v1";

export interface FishAudioSettings {
  temperature: number;
  top_p: number;
  speed: number;
  volume: number;
}

function parseFloatEnv(key: string, fallback: number, min: number, max: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function getTtsModel(): string {
  return getFishAudioModel();
}

export function getFishAudioSettings(): FishAudioSettings {
  return {
    temperature: parseFloatEnv("FISH_AUDIO_TEMPERATURE", 0.7, 0, 1),
    top_p: parseFloatEnv("FISH_AUDIO_TOP_P", 0.7, 0, 1),
    speed: parseFloatEnv("FISH_AUDIO_SPEED", 1.0, 0.5, 2),
    volume: parseFloatEnv("FISH_AUDIO_VOLUME", 0, -20, 20),
  };
}

/** Included in audio cache keys so setting changes regenerate audio. */
export function getTtsSettingsFingerprint(dialect: Dialect = "standard"): string {
  const s = getFishAudioSettings();
  const parts = [
    getTtsModel(),
    s.temperature.toFixed(2),
    s.top_p.toFixed(2),
    s.speed.toFixed(2),
    s.volume.toFixed(2),
    getFishAudioVoiceIdForDialect(dialect) ?? "default",
    dialect,
  ];
  if (dialect === "standard") {
    parts.push(STANDARD_TTS_CACHE_VERSION);
  }
  return parts.join("|");
}

export function buildTtsCacheKey(
  sentenceId: string,
  ttsText: string,
  dialect: Dialect = "standard"
): string {
  return `${getTtsSettingsFingerprint(dialect)}:${sentenceId}:${ttsText}`;
}
