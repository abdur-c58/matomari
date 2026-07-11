import { buildTtsCacheKey } from "@/lib/audio/elevenlabs-config";

export async function getTextHashAsync(
  sentenceId: string,
  ttsText: string
): Promise<string> {
  const data = new TextEncoder().encode(buildTtsCacheKey(sentenceId, ttsText));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
