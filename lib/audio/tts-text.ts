import type { Register, Sentence } from "@/types/sentence";
import { enhanceTtsProsody, type TtsProsodyContext } from "@/lib/audio/tts-prosody";

/** Hiragana, katakana, and common punctuation allowed in a TTS reading line. */
const KANA_READING_PATTERN =
  /^[\u3040-\u309f\u30a0-\u30ff\u31f0-\u31ff\u3000-\u303f\uff65-\uff9f0-9A-Za-z\s・ー〜…！？。、（）「」\-\.,!?'"()]+$/;

const KANJI_PATTERN = /[\u4e00-\u9faf\u3400-\u4dbf]/;

/**
 * A valid reading for TTS must be kana-only (no kanji) so the engine cannot
 * mis-guess pronunciation. Loanwords may use katakana.
 */
export function isValidKanaReading(reading: string | undefined | null): boolean {
  const trimmed = reading?.trim();
  if (!trimmed) return false;
  if (KANJI_PATTERN.test(trimmed)) return false;
  if (!/[\u3040-\u309f\u30a0-\u30ff]/.test(trimmed)) return false;
  return KANA_READING_PATTERN.test(trimmed);
}

/** Text passed to TTS — always prefer validated kana reading over kanji surface form. */
export function getTtsText(sentence: Pick<Sentence, "japanese" | "reading">): string | null {
  return getTtsTextFromFields(sentence.japanese, sentence.reading);
}

export function getTtsTextFromFields(
  japanese: string | undefined | null,
  reading: string | undefined | null
): string | null {
  const surface = japanese?.trim();
  if (!surface) return null;

  if (isValidKanaReading(reading)) {
    return reading!.trim();
  }

  // Hiragana/katakana-only surface (no kanji) is safe to speak directly.
  if (!KANJI_PATTERN.test(surface) && /[\u3040-\u309f\u30a0-\u30ff]/.test(surface)) {
    return surface;
  }

  return null;
}

export function assertTtsText(
  sentence: Pick<Sentence, "id" | "japanese" | "reading">
): string {
  const text = getTtsText(sentence);
  if (!text) {
    throw new Error(
      `Sentence ${sentence.id} needs a kana-only reading before audio can be generated`
    );
  }
  return text;
}

/** Kana reading + delivery cues (pauses, sighs) for ElevenLabs — used for synthesis & cache keys. */
export function getSpokenScript(
  sentence: {
    japanese?: string | null;
    reading?: string | null;
    register?: Register | string;
    tags?: string[];
    context_notes?: string;
    english?: string;
  },
  prosodyCtx?: TtsProsodyContext
): string | null {
  const reading = getTtsTextFromFields(sentence.japanese, sentence.reading);
  if (!reading) return null;
  return enhanceTtsProsody(reading, {
    register: sentence.register,
    tags: sentence.tags,
    context_notes: sentence.context_notes,
    english: sentence.english,
    ...prosodyCtx,
  });
}

export function getSpokenScriptFromFields(
  fields: {
    japanese?: string | null;
    reading?: string | null;
    register?: Register | string;
    tags?: string[];
    context_notes?: string;
    english?: string;
  },
  prosodyCtx?: TtsProsodyContext
): string | null {
  return getSpokenScript(fields, prosodyCtx);
}
