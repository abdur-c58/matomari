const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_ELEVENLABS_VOICE_ID = "pNInz6obpgDQGcFmaJgB";
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

export function getElevenLabsApiKey(): string | undefined {
  return process.env.ELEVENLABS_API_KEY;
}

export function getElevenLabsVoiceId(): string {
  return process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_ELEVENLABS_VOICE_ID;
}

export function isElevenLabsConfigured(): boolean {
  return Boolean(getElevenLabsApiKey());
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
