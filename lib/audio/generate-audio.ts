import { createHash } from "crypto";
import { mkdir, readFile, writeFile, access } from "fs/promises";
import path from "path";
import {
  getAudioR2Key,
  getR2Object,
  putR2Object,
  r2ObjectExists,
  isR2Configured,
} from "@/lib/storage/r2-client";
import { upsertAudioMetadata } from "@/lib/supabase/server-data";
import { getElevenLabsApiKey, getElevenLabsVoiceIdForDialect } from "@/lib/env";
import type { Dialect } from "@/lib/constants/dialect";
import {
  buildTtsCacheKey,
  getElevenLabsModel,
  getElevenLabsVoiceSettings,
} from "@/lib/audio/elevenlabs-config";
import { ElevenLabsQuotaError, ElevenLabsTTSError } from "@/lib/audio/tts-errors";

const CACHE_DIR = path.join(process.cwd(), "data", "audio-cache");

/** Cache key uses spoken text + voice settings so tuning changes regenerate audio. */
export function getTextHash(
  sentenceId: string,
  ttsText: string,
  dialect: Dialect = "standard"
): string {
  return createHash("sha256").update(buildTtsCacheKey(sentenceId, ttsText, dialect)).digest("hex");
}

async function readFilesystemCache(hash: string): Promise<Buffer | null> {
  const filePath = path.join(CACHE_DIR, `${hash}.mp3`);
  try {
    await access(filePath);
    return readFile(filePath);
  } catch {
    return null;
  }
}

async function saveFilesystemCache(hash: string, buffer: Buffer): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(path.join(CACHE_DIR, `${hash}.mp3`), buffer);
}

export interface TTSProvider {
  generate(spokenText: string, sentenceId: string): Promise<ArrayBuffer>;
}

export class ElevenLabsProvider implements TTSProvider {
  constructor(
    private apiKey: string,
    private voiceId: string
  ) {}

  async generate(spokenText: string, _sentenceId: string): Promise<ArrayBuffer> {
    const voiceSettings = getElevenLabsVoiceSettings();
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": this.apiKey,
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: spokenText,
          model_id: getElevenLabsModel(),
          language_code: "ja",
          voice_settings: voiceSettings,
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      if (response.status === 429 || body.toLowerCase().includes("quota")) {
        throw new ElevenLabsQuotaError(
          body || "ElevenLabs quota exceeded"
        );
      }
      throw new ElevenLabsTTSError(
        `ElevenLabs TTS failed: ${response.status}`,
        response.status
      );
    }

    return response.arrayBuffer();
  }
}

export async function generateServerAudio(
  ttsText: string,
  sentenceId: string,
  options?: { force?: boolean; dialect?: Dialect }
): Promise<{ buffer: Buffer; hash: string; cached: boolean; r2Key: string }> {
  const dialect = options?.dialect ?? "standard";
  const hash = getTextHash(sentenceId, ttsText, dialect);
  const r2Key = getAudioR2Key(hash);
  const force = options?.force === true;

  if (!force) {
    if (isR2Configured()) {
      const exists = await r2ObjectExists(r2Key);
      if (exists) {
        const buffer = await getR2Object(r2Key);
        if (buffer) {
          return { buffer, hash, cached: true, r2Key };
        }
      }
    } else {
      const fsCache = await readFilesystemCache(hash);
      if (fsCache) {
        return { buffer: fsCache, hash, cached: true, r2Key };
      }
    }
  }

  const apiKey = getElevenLabsApiKey();
  const voiceId = getElevenLabsVoiceIdForDialect(dialect);

  if (!apiKey) {
    throw new Error("TTS_NOT_CONFIGURED");
  }

  const provider = new ElevenLabsProvider(apiKey, voiceId);
  const arrayBuffer = await provider.generate(ttsText, sentenceId);
  const buffer = Buffer.from(arrayBuffer);

  if (isR2Configured()) {
    await putR2Object(r2Key, buffer);
    await upsertAudioMetadata(hash, sentenceId, r2Key);
  } else {
    await saveFilesystemCache(hash, buffer);
  }

  return { buffer, hash, cached: false, r2Key };
}
