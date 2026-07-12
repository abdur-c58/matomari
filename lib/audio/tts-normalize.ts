const KANJI_PATTERN = /[\u4e00-\u9faf\u3400-\u4dbf]/;
const PLACEHOLDER_TAG = /\[[a-z][a-z0-9_]*\]/i;

/** Hiragana → katakana (same codepoint offset used across Japanese blocks). */
export function hiraganaToKatakana(text: string): string {
  return text.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

export function katakanaToHiragana(text: string): string {
  return text.replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

export function hasJapaneseScript(text: string): boolean {
  return /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text);
}

export function hasPlaceholderTags(text: string | undefined | null): boolean {
  if (!text?.trim()) return false;
  return PLACEHOLDER_TAG.test(text);
}

/**
 * Standard Japanese with kanji/katakana — ElevenLabs handles compounds like 出身
 * and loanwords better than all-hiragana readings (e.g. しゅっしん → "susushin").
 */
export function canUseJapaneseSurfaceForTts(
  japanese: string | undefined | null,
  dialect: "standard" | "kansai"
): boolean {
  if (dialect !== "standard") return false;
  const trimmed = japanese?.trim();
  if (!trimmed || !hasJapaneseScript(trimmed)) return false;
  if (hasPlaceholderTags(trimmed)) return false;
  return true;
}

/** Put katakana loanwords back when reading over-hiraganaizes them (あめりか → アメリカ). */
export function restoreKatakanaLoanwords(kanaText: string, japanese: string): string {
  const runs = japanese.match(/[\u30a0-\u30ffー]+/g) ?? [];
  if (runs.length === 0) return kanaText;

  let result = kanaText;
  for (const katakana of runs) {
    const hiragana = katakanaToHiragana(katakana);
    if (hiragana.length >= 2 && result.includes(hiragana)) {
      result = result.replace(hiragana, katakana);
    }
  }
  return result;
}

/**
 * Promote hiragana morphemes with sokuon (っ) to katakana — helps ElevenLabs with
 * しゅっしん (shu+sshin) and similar contracted sequences.
 *
 * Threshold raised to ≥5 chars to avoid over-transforming short common words like
 * 「きって」 or 「やっぱり」 where hiragana pronunciation is already clear to the model.
 */
export function promoteSokuonClusters(text: string): string {
  return text.replace(/([\u3041-\u309f]{2,}っ[\u3041-\u309f]{2,})/g, (match) => {
    // Only promote longer clusters — short ones are fine as hiragana
    if (match.length < 5) return match;
    return hiraganaToKatakana(match);
  });
}

/**
 * Insert spaces between long katakana runs to help ElevenLabs segment words.
 * Only applied when the overall text is long enough to benefit.
 */
export function insertTtsWordBoundaries(text: string): string {
  // Skip for short phrases — spacing short katakana causes choppy delivery
  if (text.replace(/\s/g, "").length < 12) return text;
  return text
    .replace(/([\u30a0-\u30ff]{4,})([\u30a0-\u30ff]{3,})/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Final polish for text sent to ElevenLabs (after surface vs reading is chosen).
 */
export function normalizeForElevenLabs(
  text: string,
  japanese?: string | null,
  options?: { fromKanaReading?: boolean }
): string {
  let result = text.trim();
  if (!result) return result;

  if (options?.fromKanaReading) {
    if (japanese?.trim()) {
      result = restoreKatakanaLoanwords(result, japanese.trim());
    }
    if (!KANJI_PATTERN.test(result)) {
      const before = result;
      result = promoteSokuonClusters(result);
      if (result !== before) {
        result = insertTtsWordBoundaries(result);
      }
    }
  }

  return result;
}
