import { buildTtsCacheKey } from "@/lib/audio/tts-config";
import type { Dialect } from "@/lib/constants/dialect";

export async function getTextHashAsync(
  sentenceId: string,
  ttsText: string,
  dialect: Dialect = "standard"
): Promise<string> {
  const data = new TextEncoder().encode(buildTtsCacheKey(sentenceId, ttsText, dialect));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
