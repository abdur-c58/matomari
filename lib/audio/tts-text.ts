import type { Register, Sentence, SentencePlaceholder } from "@/types/sentence";
import type { Dialect } from "@/lib/constants/dialect";
import { enhanceTtsProsody, type TtsProsodyContext } from "@/lib/audio/tts-prosody";
import { resolveReadingForTts } from "@/lib/sentence/placeholders";

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

type TtsFieldOptions = {
  dialect?: Dialect;
  phonetic_reading?: string | null;
  placeholders?: SentencePlaceholder[];
  learnerName?: string | null;
};

function resolveBaseReading(
  japanese: string | undefined | null,
  reading: string | undefined | null,
  options?: TtsFieldOptions
): string | null {
  const dialect = options?.dialect ?? "standard";
  const placeholders = options?.placeholders;

  if (dialect === "kansai" && isValidKanaReading(options?.phonetic_reading)) {
    const resolved = placeholders?.length
      ? resolveReadingForTts(
          { reading: options!.phonetic_reading!, placeholders },
          options?.learnerName ?? null,
          dialect
        )
      : options!.phonetic_reading!.trim();
    return resolved;
  }

  if (placeholders?.length && isValidKanaReading(reading)) {
    return resolveReadingForTts(
      { reading: reading!, placeholders },
      options?.learnerName ?? null,
      dialect
    );
  }

  if (isValidKanaReading(reading)) {
    return reading!.trim();
  }

  const surface = japanese?.trim();
  if (!surface) return null;

  if (!KANJI_PATTERN.test(surface) && /[\u3040-\u309f\u30a0-\u30ff]/.test(surface)) {
    return surface;
  }

  return null;
}

/** Text passed to TTS — always prefer validated kana reading over kanji surface form. */
export function getTtsText(
  sentence: Pick<Sentence, "japanese" | "reading" | "placeholders">,
  options?: Pick<TtsFieldOptions, "dialect" | "phonetic_reading" | "learnerName">
): string | null {
  return getTtsTextFromFields(sentence.japanese, sentence.reading, {
    ...options,
    placeholders: sentence.placeholders,
  });
}

export function getTtsTextFromFields(
  japanese: string | undefined | null,
  reading: string | undefined | null,
  options?: TtsFieldOptions
): string | null {
  return resolveBaseReading(japanese, reading, options);
}

export function assertTtsText(
  sentence: Pick<Sentence, "id" | "japanese" | "reading" | "phonetic_reading" | "placeholders">,
  dialect: Dialect = "standard",
  learnerName?: string | null
): string {
  const text = getTtsTextFromFields(sentence.japanese, sentence.reading, {
    dialect,
    phonetic_reading: sentence.phonetic_reading,
    placeholders: sentence.placeholders,
    learnerName,
  });
  if (!text) {
    throw new Error(
      dialect === "kansai"
        ? `Sentence ${sentence.id} needs a Kansai phonetic reading before audio can be generated`
        : `Sentence ${sentence.id} needs a kana-only reading before audio can be generated`
    );
  }
  return text;
}

/** Kana reading + delivery cues (pauses, sighs) for ElevenLabs — used for synthesis & cache keys. */
export function getSpokenScript(
  sentence: {
    japanese?: string | null;
    reading?: string | null;
    phonetic_reading?: string | null;
    placeholders?: SentencePlaceholder[];
    register?: Register | string;
    tags?: string[];
    context_notes?: string;
    english?: string;
  },
  prosodyCtx?: TtsProsodyContext & { dialect?: Dialect; learnerName?: string | null }
): string | null {
  const dialect = prosodyCtx?.dialect ?? "standard";
  const reading = getTtsTextFromFields(sentence.japanese, sentence.reading, {
    dialect,
    phonetic_reading: sentence.phonetic_reading,
    placeholders: sentence.placeholders,
    learnerName: prosodyCtx?.learnerName,
  });
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
    phonetic_reading?: string | null;
    placeholders?: SentencePlaceholder[];
    register?: Register | string;
    tags?: string[];
    context_notes?: string;
    english?: string;
  },
  prosodyCtx?: TtsProsodyContext & { dialect?: Dialect; learnerName?: string | null }
): string | null {
  return getSpokenScript(fields, prosodyCtx);
}
