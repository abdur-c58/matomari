/**
 * ElevenLabs voice tuning — see .env.example for guidance.
 *
 * stability: lower = more expressive/variable (good for natural speech)
 * style: higher = more character/emphasis (v2+ models)
 * speed: 1.0 = normal; ~0.92–0.97 can help learners follow shadowing
 */

import { getElevenLabsVoiceIdForDialect } from "@/lib/env";
import type { Dialect } from "@/lib/constants/dialect";

const DEFAULT_MODEL = "eleven_multilingual_v2";

export interface ElevenLabsVoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
  use_speaker_boost: boolean;
}

function parseFloatEnv(key: string, fallback: number, min: number, max: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseBoolEnv(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  return raw === "1" || raw.toLowerCase() === "true";
}

/** Conversational defaults — less monotone than ElevenLabs' 0.5/0.75 baseline. */
export function getElevenLabsModel(): string {
  return process.env.ELEVENLABS_MODEL?.trim() || DEFAULT_MODEL;
}

export function getElevenLabsVoiceSettings(): ElevenLabsVoiceSettings {
  return {
    stability: parseFloatEnv("ELEVENLABS_STABILITY", 0.52, 0, 1),
    similarity_boost: parseFloatEnv("ELEVENLABS_SIMILARITY", 0.75, 0, 1),
    style: parseFloatEnv("ELEVENLABS_STYLE", 0.1, 0, 1),
    speed: parseFloatEnv("ELEVENLABS_SPEED", 1.0, 0.25, 4),
    use_speaker_boost: parseBoolEnv("ELEVENLABS_SPEAKER_BOOST", true),
  };
}

/** Included in audio cache keys so setting changes regenerate audio. */
export function getElevenLabsSettingsFingerprint(dialect: Dialect = "standard"): string {
  const s = getElevenLabsVoiceSettings();
  return [
    getElevenLabsModel(),
    s.stability.toFixed(2),
    s.similarity_boost.toFixed(2),
    s.style.toFixed(2),
    s.speed.toFixed(2),
    s.use_speaker_boost ? "1" : "0",
    getElevenLabsVoiceIdForDialect(dialect),
    dialect,
  ].join("|");
}

export function buildTtsCacheKey(
  sentenceId: string,
  ttsText: string,
  dialect: Dialect = "standard"
): string {
  return `${getElevenLabsSettingsFingerprint(dialect)}:${sentenceId}:${ttsText}`;
}
