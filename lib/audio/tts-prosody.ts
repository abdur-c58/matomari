import type { Register } from "@/types/sentence";
import { getTtsModel } from "@/lib/audio/tts-config";

export interface TtsProsodyContext {
  model?: string;
  register?: Register | string;
  tags?: string[];
  context_notes?: string;
  english?: string;
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
  // Model is read only to keep the context signature stable; Fish Audio derives
  // prosody from natural punctuation rather than SSML tags.
  void (ctx.model ?? getTtsModel());
  let text = reading.trim();

  // 「…、もう。」 — only when clearly exasperated; a light ellipsis beat that Fish
  // Audio renders as a natural pause (no SSML/break tags).
  if (/、\s*もう/.test(text) && looksFrustrated(ctx)) {
    text = text.replace(/、\s*(もう)/, "、 … $1");
  }

  return text;
}

/** Strip inline tags / legacy SSML for Web Speech fallback. */
export function stripTtsMarkup(spokenScript: string): string {
  return spokenScript
    .replace(/\[[^\]]+\]/g, "")
    .replace(/<break[^>]*\/?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
