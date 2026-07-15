import type { Dialect } from "@/lib/constants/dialect";
import { isValidKanaReading } from "@/lib/audio/tts-text";
import type {
  PlaceholderResolveAs,
  Sentence,
  SentencePlaceholder,
  TranslatedFields,
} from "@/types/sentence";

export const PLACEHOLDER_PATTERN = /\[([a-z][a-z0-9_]*)\]/gi;

/** Default when English/Japanese contain [name] without explicit placeholder metadata. */
export const DEFAULT_NAME_PLACEHOLDER: SentencePlaceholder = {
  tag: "name",
  resolveAs: "learner",
  readingSubstitute: "なまえ",
};

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

/**
 * Ensure [name] in text resolves as the learner even when premade seeds omit
 * placeholders metadata (common for catalog English before translation).
 */
export function withDefaultNamePlaceholder(
  placeholders: SentencePlaceholder[] | undefined,
  texts?: Array<string | undefined | null>
): SentencePlaceholder[] | undefined {
  const list = [...(placeholders ?? [])];
  const hasNameSpec = list.some((p) => p.tag.toLowerCase() === "name");
  if (hasNameSpec) return list.length ? list : undefined;

  const textHasName = (texts ?? []).some(
    (t) => typeof t === "string" && /\[name\]/i.test(t)
  );
  if (!textHasName) return placeholders;

  list.push({ ...DEFAULT_NAME_PLACEHOLDER });
  return list;
}

function resolveAsForTag(
  tag: string,
  spec: SentencePlaceholder | undefined
): PlaceholderResolveAs | undefined {
  if (spec?.resolveAs) return spec.resolveAs;
  if (tag.toLowerCase() === "name") return "learner";
  return undefined;
}

export function resolvePlaceholderDisplayValue(
  tag: string,
  spec: SentencePlaceholder | undefined,
  learnerName: string | null,
  options?: { script?: "latin" | "japanese"; learnerJapaneseName?: string | null }
): string {
  if (resolveAsForTag(tag, spec) === "learner") {
    if (options?.script === "japanese" && options.learnerJapaneseName) {
      return options.learnerJapaneseName;
    }
    if (learnerName) return learnerName;
  }
  if (spec?.label) return spec.label;
  return `[${tag}]`;
}

export function resolveReadingForTts(
  sentence: Pick<Sentence, "reading" | "placeholders">,
  learnerJapaneseName: string | null,
  _dialect: Dialect = "standard"
): string | null {
  const reading = sentence.reading?.trim();
  if (!reading) return null;

  return applyReadingSubstitutes(reading, sentence.placeholders, learnerJapaneseName);
}

/** Kana readingSubstitute → common romaji token used in stored romaji fields. */
const KANA_TO_LATIN_SUBSTITUTE: Record<string, string> = {
  なまえ: "namae",
};

function applyReadingSubstitutes(
  text: string,
  placeholders: SentencePlaceholder[] | undefined,
  learnerJapaneseName: string | null
): string {
  const specs = withDefaultNamePlaceholder(
    placeholders,
    // If reading still has the default kana substitute, treat as name slot
    text.includes(DEFAULT_NAME_PLACEHOLDER.readingSubstitute) ? ["[name]"] : []
  );
  let result = text;

  for (const spec of specs ?? []) {
    const substitute = spec.readingSubstitute?.trim();
    if (!substitute || !result.includes(substitute)) continue;

    const replacement =
      resolveAsForTag(spec.tag, spec) === "learner" && learnerJapaneseName
        ? learnerJapaneseName
        : substitute;

    result = result.split(substitute).join(replacement);
  }

  return result;
}

/** Resolve kana placeholders (なまえ → パンコ) for on-screen reading lines. */
export function resolveKanaReadingForDisplay(
  reading: string | undefined | null,
  placeholders: SentencePlaceholder[] | undefined,
  learnerJapaneseName: string | null
): string | null {
  const trimmed = reading?.trim();
  if (!trimmed) return null;
  return applyReadingSubstitutes(trimmed, placeholders, learnerJapaneseName);
}

/** Resolve latin placeholder tokens (namae → Panko) when romaji lacks [tags]. */
export function resolveLatinReadingSubstitutes(
  text: string,
  placeholders: SentencePlaceholder[] | undefined,
  learnerName: string | null
): string {
  if (!text || !learnerName) return text;

  const specs = withDefaultNamePlaceholder(
    placeholders,
    text.toLowerCase().includes("namae") ? ["[name]"] : []
  );
  if (!specs?.length) return text;

  let result = text;
  for (const spec of specs) {
    if (resolveAsForTag(spec.tag, spec) !== "learner") continue;
    const kanaSub = spec.readingSubstitute?.trim();
    if (!kanaSub) continue;

    const latinSub = KANA_TO_LATIN_SUBSTITUTE[kanaSub];
    if (latinSub) {
      result = result.replace(new RegExp(latinSub, "gi"), learnerName);
    }
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
