/**
 * Fish Audio S2.1 paralinguistic tags — compiled to bracket tags only
 * at the TTS boundary. Never stored in japanese/reading/romaji (UI fields).
 *
 * App placeholders like [name] stay in Placeholders; Fish cues use
 * structured metadata (paralinguisticTags / legacy FishAudioDirectives)
 * so the two tag systems never collide.
 *
 * Fish s2.1-pro-free treats [bracket] tags as free-form natural-language
 * instructions — not a fixed enum. Prefer sentence.paralinguisticTags.
 */

/** Bounded pause set for natural conversation turns (ms). */
export const NARRATION_PAUSE_MS_OPTIONS = [
  250, 400, 600, 800, 1000, 1200, 1500, 2000, 2500, 3000,
] as const;

export type NarrationPauseMs = (typeof NARRATION_PAUSE_MS_OPTIONS)[number];

/**
 * Legacy allowlists kept for normalizing premade catalog sidecars.
 * New generation should emit free-form paralinguisticTags instead.
 */
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

export const FISH_BREAK_CUES = ["break", "long-break"] as const;

export type FishBreakCue = (typeof FISH_BREAK_CUES)[number];

/** @deprecated Prefer free-form paralinguisticTags on sentences. */
export interface FishAudioDirectives {
  expression?: string;
  effect?: string;
  breakCue?: string;
}

export interface NarrationAudioDirectives {
  pauseAfterMs: NarrationPauseMs;
  fishAudio?: FishAudioDirectives;
  /** Free-form Fish tags preferred for new narration lines. */
  paralinguisticTags?: string[];
}

const EXPRESSION_SET = new Set<string>(FISH_EXPRESSION_CUES);
const EFFECT_SET = new Set<string>(FISH_EFFECT_CUES);
const BREAK_SET = new Set<string>(FISH_BREAK_CUES);
const PAUSE_SET = new Set<number>(NARRATION_PAUSE_MS_OPTIONS);

const MAX_PARALINGUISTIC_TAG_LENGTH = 120;
const MAX_PARALINGUISTIC_TAGS = 4;

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

/**
 * Sanitize free-form Fish instruction tags.
 * Strips brackets, trims, drops empties/oversized entries.
 */
export function sanitizeParalinguisticTags(
  raw: unknown
): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const cleaned = item
      .replace(/[\[\]]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_PARALINGUISTIC_TAG_LENGTH);
    if (!cleaned) continue;
    if (out.includes(cleaned)) continue;
    out.push(cleaned);
    if (out.length >= MAX_PARALINGUISTIC_TAGS) break;
  }
  return out.length > 0 ? out : undefined;
}

/** Combine island-level tone with line-level reactions, preserving stable order. */
export function combineParalinguisticTags(
  ...groups: Array<string[] | null | undefined>
): string[] | undefined {
  return sanitizeParalinguisticTags(groups.flatMap((group) => group ?? []));
}

/** Convert legacy expression/effect/breakCue objects into free-form tags. */
export function legacyFishDirectivesToTags(
  directives?: FishAudioDirectives | null
): string[] | undefined {
  if (!directives) return undefined;
  const tags: string[] = [];
  if (typeof directives.expression === "string" && directives.expression.trim()) {
    tags.push(directives.expression.trim());
  }
  if (typeof directives.effect === "string" && directives.effect.trim()) {
    tags.push(directives.effect.trim());
  }
  if (typeof directives.breakCue === "string" && directives.breakCue.trim()) {
    tags.push(directives.breakCue.trim());
  }
  return sanitizeParalinguisticTags(tags);
}

export function parseFishAudioDirectives(
  raw: unknown
): FishAudioDirectives | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const out: FishAudioDirectives = {};

  if (typeof obj.expression === "string" && obj.expression.trim()) {
    out.expression = obj.expression.trim();
  }
  if (typeof obj.effect === "string" && obj.effect.trim()) {
    out.effect = obj.effect.trim();
  }
  if (typeof obj.breakCue === "string" && obj.breakCue.trim()) {
    out.breakCue = obj.breakCue.trim();
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
  const paralinguisticTags =
    sanitizeParalinguisticTags(obj.paralinguisticTags) ??
    legacyFishDirectivesToTags(fishAudio);
  return {
    pauseAfterMs,
    ...(fishAudio ? { fishAudio } : {}),
    ...(paralinguisticTags ? { paralinguisticTags } : {}),
  };
}

/**
 * Inject Fish S2.1 bracket tags into already-resolved spoken Japanese/kana.
 * Does NOT touch app placeholders — those must already be substituted.
 */
export function compileFishAudioScript(
  spokenText: string,
  directives?: FishAudioDirectives | null,
  paralinguisticTags?: string[] | null
): string {
  const base = spokenText.trim();
  if (!base) return base;

  const freeform =
    sanitizeParalinguisticTags(paralinguisticTags) ??
    legacyFishDirectivesToTags(directives);

  if (freeform && freeform.length > 0) {
    const leading = freeform
      .filter((t) => t !== "break" && t !== "long-break")
      .map((t) => `[${t}]`);
    const breakTag = freeform.find((t) => t === "break" || t === "long-break");
    let result =
      leading.length > 0 ? `${leading.join("")} ${base}` : base;
    if (breakTag) {
      result = `${result} [${breakTag}]`;
    }
    return result.replace(/\s+/g, " ").trim();
  }

  if (!directives) return base;

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
