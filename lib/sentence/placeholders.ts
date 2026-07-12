import type { Dialect } from "@/lib/constants/dialect";
import { isValidKanaReading } from "@/lib/audio/tts-text";
import type {
  PlaceholderResolveAs,
  Sentence,
  SentencePlaceholder,
  TranslatedFields,
} from "@/types/sentence";
import { toKatakanaForTts } from "@/lib/sentence/learner-name";

export const PLACEHOLDER_PATTERN = /\[([a-z][a-z0-9_]*)\]/gi;

export type PlaceholderSegment =
  | { type: "text"; value: string }
  | { type: "tag"; tag: string; raw: string };

export function parsePlaceholderTags(text: string): PlaceholderSegment[] {
  const segments: PlaceholderSegment[] = [];
  let lastIndex = 0;
  const re = new RegExp(PLACEHOLDER_PATTERN.source, "gi");
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "tag", tag: match[1].toLowerCase(), raw: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments;
}

export function extractPlaceholderTags(text: string): string[] {
  const tags = new Set<string>();
  const re = new RegExp(PLACEHOLDER_PATTERN.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    tags.add(match[1].toLowerCase());
  }
  return [...tags];
}

export function getPlaceholderSpec(
  sentence: Pick<Sentence, "placeholders">,
  tag: string
): SentencePlaceholder | undefined {
  return sentence.placeholders?.find((p) => p.tag.toLowerCase() === tag.toLowerCase());
}

export function resolvePlaceholderDisplayValue(
  tag: string,
  spec: SentencePlaceholder | undefined,
  learnerName: string | null
): string {
  if (spec?.resolveAs === "learner" && learnerName) {
    return learnerName;
  }
  if (spec?.label) return spec.label;
  return `[${tag}]`;
}

export function resolveReadingForTts(
  sentence: Pick<Sentence, "reading" | "placeholders">,
  learnerName: string | null,
  dialect: Dialect = "standard"
): string | null {
  const reading = sentence.reading?.trim();
  if (!reading) return null;

  let result = reading;
  const placeholders = sentence.placeholders ?? [];

  for (const spec of placeholders) {
    const substitute = spec.readingSubstitute?.trim();
    if (!substitute || !result.includes(substitute)) continue;

    let replacement = substitute;
    if (spec.resolveAs === "learner") {
      const katakana =
        dialect === "kansai"
          ? toKatakanaForTts(learnerName) ?? substitute
          : toKatakanaForTts(learnerName) ?? substitute;
      replacement = katakana;
    }

    result = result.replace(substitute, replacement);
  }

  return result;
}

export function isLearnerTemplateContext(contextNotes?: string): boolean {
  if (!contextNotes) return false;
  const lower = contextNotes.toLowerCase();
  return (
    lower.includes("learner") ||
    lower.includes("template") ||
    lower.includes("blank is filled") ||
    lower.includes("own name")
  );
}

export function normalizeLegacyUnderscores(sentence: Sentence): Sentence {
  const hasUnderscores =
    sentence.english.includes("___") ||
    sentence.japanese?.includes("___") ||
    sentence.reading?.includes("___") ||
    sentence.romaji?.includes("___");

  if (!hasUnderscores) return sentence;
  if (!isLearnerTemplateContext(sentence.context_notes)) return sentence;

  const placeholders: SentencePlaceholder[] = sentence.placeholders ?? [
    {
      tag: "name",
      resolveAs: "learner",
      readingSubstitute: "なまえ",
    },
  ];

  return {
    ...sentence,
    english: sentence.english.replace(/___/g, "[name]"),
    japanese: sentence.japanese?.replace(/___/g, "[name]"),
    reading: sentence.reading?.replace(/___/g, "なまえ"),
    romaji: sentence.romaji?.replace(/___/g, "[name]"),
    placeholders,
  };
}

export function validatePlaceholderTranslations(
  japanese: string,
  reading: string,
  placeholders: SentencePlaceholder[] | undefined,
  phoneticReading?: string
): { valid: boolean; error?: string } {
  if (!isValidKanaReading(reading)) {
    return { valid: false, error: "reading must be kana-only with no bracket tags or underscores" };
  }

  if (phoneticReading && !isValidKanaReading(phoneticReading)) {
    return {
      valid: false,
      error: "phonetic_reading must be kana-only with no bracket tags or underscores",
    };
  }

  if (reading.includes("[") || reading.includes("]") || reading.includes("_")) {
    return { valid: false, error: "reading must not contain placeholders or underscores" };
  }

  const tagsInJapanese = extractPlaceholderTags(japanese);
  const specs = placeholders ?? [];

  for (const tag of tagsInJapanese) {
    const spec = specs.find((p) => p.tag.toLowerCase() === tag);
    if (!spec) {
      return { valid: false, error: `missing placeholder metadata for [${tag}]` };
    }
    if (!spec.readingSubstitute?.trim()) {
      return { valid: false, error: `missing readingSubstitute for [${tag}]` };
    }
    if (!reading.includes(spec.readingSubstitute.trim())) {
      return {
        valid: false,
        error: `reading must include kana substitute "${spec.readingSubstitute}" for [${tag}]`,
      };
    }
  }

  return { valid: true };
}

export function mergePlaceholderFields(fields: TranslatedFields): TranslatedFields {
  if (!fields.placeholders?.length) return fields;
  return fields;
}

export type { PlaceholderResolveAs };
