const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";
const DEFAULT_FISH_AUDIO_MODEL = "s2.1-pro-free";
const DEFAULT_R2_BUCKET_NAME = "shima-audio";

export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function getSupabasePublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabaseSecretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

export function isSupabaseServerConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey());
}

export function getOpenAIApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY;
}

export function getOpenAIModelName(): string {
  return process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(getOpenAIApiKey());
}

export function getFishAudioApiKey(): string | undefined {
  return process.env.FISH_AUDIO_API_KEY;
}

/** Fish Audio TTS model sent via the required `model` header (e.g. s2.1-pro-free, s2.1-pro, s2-pro). */
export function getFishAudioModel(): string {
  return process.env.FISH_AUDIO_MODEL?.trim() || DEFAULT_FISH_AUDIO_MODEL;
}

/** Standard-dialect Fish Audio voice model id (reference_id) — speaker A. */
export function getFishAudioVoiceId(): string | undefined {
  const id = process.env.FISH_AUDIO_VOICE_ID?.trim();
  return id || undefined;
}

/** Kansai-dialect Fish Audio voice model id (reference_id) — speaker A. */
export function getFishAudioKansaiVoiceId(): string | undefined {
  const id = process.env.FISH_AUDIO_KANSAI_VOICE_ID?.trim();
  return id || undefined;
}

/** Standard-dialect Fish Audio voice for narration speaker B. */
export function getFishAudioVoiceIdB(): string | undefined {
  const id = process.env.FISH_AUDIO_VOICE_ID_B?.trim();
  return id || undefined;
}

/** Kansai-dialect Fish Audio voice for narration speaker B. */
export function getFishAudioKansaiVoiceIdB(): string | undefined {
  const id = process.env.FISH_AUDIO_KANSAI_VOICE_ID_B?.trim();
  return id || undefined;
}

/**
 * Fish Audio voice model id (reference_id) for a dialect + narration speaker.
 * Speaker B falls back to A for that dialect when unset.
 */
export function getFishAudioVoiceIdForDialect(
  dialect: "standard" | "kansai" = "standard",
  speaker: "A" | "B" = "A"
): string | undefined {
  if (speaker === "B") {
    if (dialect === "kansai") {
      return (
        getFishAudioKansaiVoiceIdB() ??
        getFishAudioVoiceIdB() ??
        getFishAudioKansaiVoiceId() ??
        getFishAudioVoiceId()
      );
    }
    return getFishAudioVoiceIdB() ?? getFishAudioVoiceId();
  }

  if (dialect === "kansai") {
    return getFishAudioKansaiVoiceId() ?? getFishAudioVoiceId();
  }
  return getFishAudioVoiceId();
}

export function isFishAudioConfigured(): boolean {
  return Boolean(getFishAudioApiKey());
}

export function getR2AccountId(): string | undefined {
  return process.env.R2_ACCOUNT_ID;
}

export function getR2AccessKeyId(): string | undefined {
  return process.env.R2_ACCESS_KEY_ID;
}

export function getR2SecretAccessKey(): string | undefined {
  return process.env.R2_SECRET_ACCESS_KEY;
}

export function getR2BucketName(): string {
  return process.env.R2_BUCKET_NAME ?? DEFAULT_R2_BUCKET_NAME;
}

export function isR2Configured(): boolean {
  return Boolean(
    getR2AccountId() &&
      getR2AccessKeyId() &&
      getR2SecretAccessKey() &&
      process.env.R2_BUCKET_NAME
  );
}
