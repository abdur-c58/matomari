import type { Register, Sentence, SentencePlaceholder } from "@/types/sentence";
import type { Dialect } from "@/lib/constants/dialect";
import {
  compileFishAudioScript,
  type FishAudioDirectives,
} from "@/lib/audio/fish-audio-cues";
import { enhanceTtsProsody, type TtsProsodyContext } from "@/lib/audio/tts-prosody";
import {
  canUseJapaneseSurfaceForTts,
  normalizeForTts,
} from "@/lib/audio/tts-normalize";
import {
  resolveReadingForTts,
  withDefaultNamePlaceholder,
} from "@/lib/sentence/placeholders";

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

/** surface = full japanese (kanji/katakana); reading = kana reading field only */
export type TtsScriptSource = "surface" | "reading";

type TtsFieldOptions = {
  dialect?: Dialect;
  phonetic_reading?: string | null;
  placeholders?: SentencePlaceholder[];
  learnerName?: string | null;
  ttsSource?: TtsScriptSource;
};

function resolveKanaReadingPath(
  japanese: string | undefined | null,
  reading: string | undefined | null,
  options: TtsFieldOptions
): string | null {
  const placeholders = withDefaultNamePlaceholder(options.placeholders, [
    japanese,
    reading?.includes("なまえ") ? "[name]" : undefined,
  ]);
  let fromKana: string | null = null;

  if (placeholders?.length && isValidKanaReading(reading)) {
    fromKana = resolveReadingForTts(
      { reading: reading!, placeholders },
      options.learnerName ?? null,
      options.dialect ?? "standard"
    );
  } else if (isValidKanaReading(reading)) {
    fromKana = reading!.trim();
  } else {
    const surface = japanese?.trim();
    if (
      surface &&
      !KANJI_PATTERN.test(surface) &&
      /[\u3040-\u309f\u30a0-\u30ff]/.test(surface)
    ) {
      fromKana = surface;
    }
  }

  if (!fromKana) return null;
  return normalizeForTts(fromKana, japanese, { fromKanaReading: true });
}

function resolveBaseReading(
  japanese: string | undefined | null,
  reading: string | undefined | null,
  options?: TtsFieldOptions
): string | null {
  const dialect = options?.dialect ?? "standard";
  const ttsSource = options?.ttsSource ?? "surface";

  if (dialect === "kansai" && isValidKanaReading(options?.phonetic_reading)) {
    const placeholders = withDefaultNamePlaceholder(options?.placeholders, [
      japanese,
      options?.phonetic_reading?.includes("なまえ") ? "[name]" : undefined,
    ]);
    const resolved = placeholders?.length
      ? resolveReadingForTts(
          { reading: options!.phonetic_reading!, placeholders },
          options?.learnerName ?? null,
          dialect
        )
      : options!.phonetic_reading!.trim();
    return resolved
      ? normalizeForTts(resolved, japanese, { fromKanaReading: true })
      : null;
  }

  if (ttsSource === "reading") {
    return resolveKanaReadingPath(japanese, reading, options ?? {});
  }

  if (canUseJapaneseSurfaceForTts(japanese, dialect)) {
    return normalizeForTts(japanese!.trim(), japanese, { fromKanaReading: false });
  }

  return resolveKanaReadingPath(japanese, reading, options ?? {});
}

/** Text passed to TTS — prefers japanese surface (standard) or normalized kana. */
export function getTtsText(
  sentence: Pick<Sentence, "japanese" | "reading" | "placeholders">,
  options?: Pick<TtsFieldOptions, "dialect" | "phonetic_reading" | "learnerName" | "ttsSource">
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

type SpokenScriptFields = {
  japanese?: string | null;
  reading?: string | null;
  phonetic_reading?: string | null;
  placeholders?: SentencePlaceholder[];
  register?: Register | string;
  tags?: string[];
  context_notes?: string;
  english?: string;
  /** Structured Fish cues — compiled after [name] resolution / normalization. */
  fishAudio?: FishAudioDirectives | null;
  /** Free-form Fish instruction tags (preferred over legacy fishAudio). */
  paralinguisticTags?: string[] | null;
};

type SpokenScriptContext = TtsProsodyContext & {
  dialect?: Dialect;
  learnerName?: string | null;
  ttsSource?: TtsScriptSource;
  fishAudio?: FishAudioDirectives | null;
  paralinguisticTags?: string[] | null;
};

/**
 * Spoken script for Fish TTS + cache keys:
 * surface/reading → resolve app placeholders → normalize → light prosody → Fish cues.
 */
export function getSpokenScript(
  sentence: SpokenScriptFields,
  prosodyCtx?: SpokenScriptContext
): string | null {
  const dialect = prosodyCtx?.dialect ?? "standard";
  const reading = getTtsTextFromFields(sentence.japanese, sentence.reading, {
    dialect,
    phonetic_reading: sentence.phonetic_reading,
    placeholders: sentence.placeholders,
    learnerName: prosodyCtx?.learnerName,
    ttsSource: prosodyCtx?.ttsSource,
  });
  if (!reading) return null;
  const withProsody = enhanceTtsProsody(reading, {
    register: sentence.register,
    tags: sentence.tags,
    context_notes: sentence.context_notes,
    english: sentence.english,
    ...prosodyCtx,
  });
  const fishAudio = prosodyCtx?.fishAudio ?? sentence.fishAudio;
  const paralinguisticTags =
    prosodyCtx?.paralinguisticTags ?? sentence.paralinguisticTags;
  return compileFishAudioScript(withProsody, fishAudio, paralinguisticTags);
}

export function getSpokenScriptFromFields(
  fields: SpokenScriptFields,
  prosodyCtx?: SpokenScriptContext
): string | null {
  return getSpokenScript(fields, prosodyCtx);
}
