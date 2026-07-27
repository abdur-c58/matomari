/**
 * Curated Fish Audio voice catalog for Pro narration voice selection.
 * Defaults A/B come from env; optional C/D expand the picker when set.
 */

export type NarrationVoiceId =
  | "voice_a"
  | "voice_b"
  | "voice_c"
  | "voice_d";

export type NarrationVoiceOption = {
  id: NarrationVoiceId;
  label: string;
  description: string;
  /** Fish Audio reference_id — resolved at runtime from env when missing. */
  envKeys: string[];
  /** Fixed Japanese line used for cached previews. */
  previewText: string;
};

export const NARRATION_VOICE_PREVIEW_TEXT =
  "こんにちは。よろしくお願いします。";

export const NARRATION_VOICE_CATALOG: NarrationVoiceOption[] = [
  {
    id: "voice_a",
    label: "Voice A",
    description: "Default Speaker A",
    envKeys: ["FISH_AUDIO_VOICE_ID"],
    previewText: NARRATION_VOICE_PREVIEW_TEXT,
  },
  {
    id: "voice_b",
    label: "Voice B",
    description: "Default Speaker B",
    envKeys: ["FISH_AUDIO_VOICE_ID_B", "FISH_AUDIO_VOICE_ID"],
    previewText: NARRATION_VOICE_PREVIEW_TEXT,
  },
  {
    id: "voice_c",
    label: "Voice C",
    description: "Alternate voice",
    envKeys: ["FISH_AUDIO_VOICE_ID_C"],
    previewText: NARRATION_VOICE_PREVIEW_TEXT,
  },
  {
    id: "voice_d",
    label: "Voice D",
    description: "Alternate voice",
    envKeys: ["FISH_AUDIO_VOICE_ID_D"],
    previewText: NARRATION_VOICE_PREVIEW_TEXT,
  },
];

export function resolveNarrationVoiceFishId(
  voiceId: NarrationVoiceId | string | undefined
): string | undefined {
  if (!voiceId) return undefined;
  const option = NARRATION_VOICE_CATALOG.find((v) => v.id === voiceId);
  if (!option) {
    // Allow raw Fish reference_id passthrough for stored scenes.
    if (/^[a-f0-9]{20,}$/i.test(voiceId) || voiceId.length > 8) {
      return voiceId;
    }
    return undefined;
  }
  for (const key of option.envKeys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

/** Voices that have a configured Fish ID in the current environment. */
export function getAvailableNarrationVoices(): NarrationVoiceOption[] {
  return NARRATION_VOICE_CATALOG.filter(
    (v) => Boolean(resolveNarrationVoiceFishId(v.id))
  );
}

export const DEFAULT_SPEAKER_VOICES = {
  A: "voice_a" as NarrationVoiceId,
  B: "voice_b" as NarrationVoiceId,
};
