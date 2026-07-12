import { getDisplayName } from "@/lib/utils/greeting";
import { isValidKanaReading } from "@/lib/audio/tts-text";

type LearnerNameUser = {
  name?: string | null;
  email?: string | null;
};

type LearnerNameSettings = {
  displayName?: string;
  japaneseNameReading?: string;
  japaneseNameSource?: string;
};

/** Canonical Latin display string used as the cache key for Japanese name translation. */
export function getLearnerNameSource(
  user?: LearnerNameUser | null,
  settings?: LearnerNameSettings | null
): string | null {
  const override = settings?.displayName?.trim();
  if (override) return override;

  const fromSession = getDisplayName(user);
  if (fromSession && fromSession !== "there") return fromSession;

  return null;
}

export function getLearnerDisplayName(
  user?: LearnerNameUser | null,
  settings?: LearnerNameSettings | null
): string | null {
  return getLearnerNameSource(user, settings);
}

export function getCachedJapaneseNameReading(
  settings?: LearnerNameSettings | null,
  source?: string | null
): string | null {
  const key = source?.trim();
  const reading = settings?.japaneseNameReading?.trim();
  if (!key || !reading) return null;
  if (settings?.japaneseNameSource?.trim() !== key) return null;
  if (!isValidKanaReading(reading)) return null;
  return reading;
}

export function needsJapaneseNameTranslation(
  user?: LearnerNameUser | null,
  settings?: LearnerNameSettings | null
): boolean {
  const source = getLearnerNameSource(user, settings);
  if (!source) return false;
  return !getCachedJapaneseNameReading(settings, source);
}

/** Lightweight Latin → katakana fallback when AI is unavailable. */
export function toKatakanaForTts(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;

  if (/^[\u3040-\u309f\u30a0-\u30ff\s]+$/.test(trimmed)) {
    return trimmed.replace(/\s+/g, "");
  }

  const map: Record<string, string> = {
    a: "ア", i: "イ", u: "ウ", e: "エ", o: "オ",
    ka: "カ", ki: "キ", ku: "ク", ke: "ケ", ko: "コ",
    sa: "サ", shi: "シ", si: "シ", su: "ス", se: "セ", so: "ソ",
    ta: "タ", chi: "チ", ti: "チ", tsu: "ツ", tu: "ツ", te: "テ", to: "ト",
    na: "ナ", ni: "ニ", nu: "ヌ", ne: "ネ", no: "ノ",
    ha: "ハ", hi: "ヒ", fu: "フ", hu: "フ", he: "ヘ", ho: "ホ",
    ma: "マ", mi: "ミ", mu: "ム", me: "メ", mo: "モ",
    ya: "ヤ", yu: "ユ", yo: "ヨ",
    ra: "ラ", ri: "リ", ru: "ル", re: "レ", ro: "ロ",
    wa: "ワ", wo: "ヲ", n: "ン",
    la: "ラ", le: "レ", li: "リ", lu: "ル", lo: "ロ",
    b: "ブ", d: "ド", r: "ル", m: "ム", s: "ス", t: "ト",
  };

  let result = "";
  const lower = trimmed.toLowerCase();
  let i = 0;

  while (i < lower.length) {
    if (lower[i] === " ") {
      i++;
      continue;
    }

    let matched = false;
    for (const len of [3, 2, 1]) {
      const chunk = lower.slice(i, i + len);
      if (map[chunk]) {
        result += map[chunk];
        i += len;
        matched = true;
        break;
      }
    }

    if (!matched) {
      result += "・";
      i++;
    }
  }

  const cleaned = result.replace(/・+$/, "").replace(/^・+/, "");
  return cleaned.length > 0 ? cleaned : null;
}

export function fallbackJapaneseNameReading(source: string | null | undefined): string | null {
  if (!source?.trim()) return null;
  return toKatakanaForTts(source);
}
