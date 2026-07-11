import type { Register } from "@/types/sentence";
import { getElevenLabsModel } from "@/lib/audio/elevenlabs-config";

export interface TtsProsodyContext {
  model?: string;
  register?: Register | string;
  tags?: string[];
  context_notes?: string;
  english?: string;
}

export function isElevenV3Model(model: string): boolean {
  return model.includes("v3");
}

function looksFrustrated(ctx: TtsProsodyContext): boolean {
  const blob = [ctx.context_notes, ctx.english, ...(ctx.tags ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /frustr|exasper|annoy|irrit|ugh|gosh|jeez|already|fed up|come on|read the room/.test(
    blob
  );
}

/**
 * Light TTS prosody — subtle only. Most sentences pass through unchanged.
 * Stronger cues apply only when tags/context explicitly signal frustration.
 */
export function enhanceTtsProsody(reading: string, ctx: TtsProsodyContext = {}): string {
  const model = ctx.model ?? getElevenLabsModel();
  const v3 = isElevenV3Model(model);
  let text = reading.trim();

  // 「…、もう。」 — only when clearly exasperated; brief beat, no sighs/theatrics
  if (/、\s*もう/.test(text) && looksFrustrated(ctx)) {
    if (v3) {
      // Ellipsis reads as a light breath; avoid [sighs] / [short pause] (too long & dramatic)
      text = text.replace(/、\s*(もう)/, "、 … $1");
    } else {
      text = text.replace(/、\s*(もう)/, "、<break time=\"0.28s\" />$1");
    }
  }

  return text;
}

/** Strip ElevenLabs tags / SSML for Web Speech fallback. */
export function stripTtsMarkup(spokenScript: string): string {
  return spokenScript
    .replace(/\[[^\]]+\]/g, "")
    .replace(/<break[^>]*\/?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
