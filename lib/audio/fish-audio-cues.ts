/**
 * Fish Audio S2.1 expression / delivery cues — compiled to bracket tags only
 * at the TTS boundary. Never stored in japanese/reading/romaji (UI fields).
 *
 * App placeholders like [name] stay in Placeholders; Fish cues use structured
 * metadata (FishAudioDirectives) so the two tag systems never collide.
 */

/** Bounded pause set for natural conversation turns (ms). */
export const NARRATION_PAUSE_MS_OPTIONS = [
  250, 400, 600, 800, 1000, 1200, 1500, 2000, 2500, 3000,
] as const;

export type NarrationPauseMs = (typeof NARRATION_PAUSE_MS_OPTIONS)[number];

/** Sentence-level emotion (usually leading). Sparse — omit for neutral lines. */
export const FISH_EXPRESSION_CUES = [
  "happy",
  "sad",
  "angry",
  "excited",
  "calm",
  "nervous",
  "confident",
  "surprised",
  "satisfied",
  "delighted",
  "worried",
  "upset",
  "frustrated",
  "empathetic",
  "embarrassed",
  "proud",
  "relaxed",
  "grateful",
  "curious",
  "sarcastic",
  "uncertain",
  "confused",
  "disappointed",
  "regretful",
  "hopeful",
  "sympathetic",
  "determined",
  "friendly",
  "enthusiastic",
  "encouraging",
] as const;

export type FishExpressionCue = (typeof FISH_EXPRESSION_CUES)[number];

/** Sound / delivery effects — optional, rarely used. */
export const FISH_EFFECT_CUES = [
  "laughing",
  "chuckling",
  "sighing",
  "gasping",
  "whispering",
  "soft tone",
  "emphasis",
  "clear throat",
] as const;

export type FishEffectCue = (typeof FISH_EFFECT_CUES)[number];

/** Optional in-audio pause tag (in addition to playlist timing). */
export const FISH_BREAK_CUES = ["break", "long-break"] as const;

export type FishBreakCue = (typeof FISH_BREAK_CUES)[number];

export interface FishAudioDirectives {
  /** Leading emotion/style cue (compiled as [expression]). */
  expression?: FishExpressionCue;
  /** Optional sound or delivery effect. */
  effect?: FishEffectCue;
  /** Optional Fish in-script break after the line (rare; prefer pauseAfterMs). */
  breakCue?: FishBreakCue;
}

export interface NarrationAudioDirectives {
  /** Playlist wait after this turn finishes (ms). */
  pauseAfterMs: NarrationPauseMs;
  fishAudio?: FishAudioDirectives;
}

const EXPRESSION_SET = new Set<string>(FISH_EXPRESSION_CUES);
const EFFECT_SET = new Set<string>(FISH_EFFECT_CUES);
const BREAK_SET = new Set<string>(FISH_BREAK_CUES);
const PAUSE_SET = new Set<number>(NARRATION_PAUSE_MS_OPTIONS);

export function isFishExpressionCue(value: string): value is FishExpressionCue {
  return EXPRESSION_SET.has(value);
}

export function isFishEffectCue(value: string): value is FishEffectCue {
  return EFFECT_SET.has(value);
}

export function isFishBreakCue(value: string): value is FishBreakCue {
  return BREAK_SET.has(value);
}

export function isNarrationPauseMs(value: number): value is NarrationPauseMs {
  return PAUSE_SET.has(value);
}

export function clampNarrationPauseMs(value: number | undefined | null): NarrationPauseMs {
  if (typeof value === "number" && isNarrationPauseMs(value)) return value;
  // Nearest allowed pause
  const n = typeof value === "number" && Number.isFinite(value) ? value : 800;
  let best: NarrationPauseMs = 800;
  let bestDist = Infinity;
  for (const opt of NARRATION_PAUSE_MS_OPTIONS) {
    const d = Math.abs(opt - n);
    if (d < bestDist) {
      bestDist = d;
      best = opt;
    }
  }
  return best;
}

export function parseFishAudioDirectives(
  raw: unknown
): FishAudioDirectives | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const out: FishAudioDirectives = {};

  if (typeof obj.expression === "string" && isFishExpressionCue(obj.expression)) {
    out.expression = obj.expression;
  }
  if (typeof obj.effect === "string" && isFishEffectCue(obj.effect)) {
    out.effect = obj.effect;
  }
  if (typeof obj.breakCue === "string" && isFishBreakCue(obj.breakCue)) {
    out.breakCue = obj.breakCue;
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

export function parseNarrationAudioDirectives(
  raw: unknown
): NarrationAudioDirectives | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const pauseAfterMs = clampNarrationPauseMs(
    typeof obj.pauseAfterMs === "number" ? obj.pauseAfterMs : undefined
  );
  const fishAudio = parseFishAudioDirectives(obj.fishAudio);
  return {
    pauseAfterMs,
    ...(fishAudio ? { fishAudio } : {}),
  };
}

/**
 * Inject Fish S2.1 bracket tags into already-resolved spoken Japanese/kana.
 * Does NOT touch app placeholders — those must already be substituted.
 */
export function compileFishAudioScript(
  spokenText: string,
  directives?: FishAudioDirectives | null
): string {
  const base = spokenText.trim();
  if (!base || !directives) return base;

  const leading: string[] = [];
  if (directives.expression) leading.push(`[${directives.expression}]`);
  if (directives.effect) leading.push(`[${directives.effect}]`);

  let result = leading.length > 0 ? `${leading.join("")} ${base}` : base;

  if (directives.breakCue) {
    result = `${result} [${directives.breakCue}]`;
  }

  return result.replace(/\s+/g, " ").trim();
}

/** Strip Fish-style bracket cues for Web Speech / display-safe fallbacks. */
export function stripFishAudioTags(text: string): string {
  return text
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
