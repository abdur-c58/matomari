import { getDisplayName } from "@/lib/utils/greeting";

type LearnerNameUser = {
  name?: string | null;
  email?: string | null;
};

type LearnerNameSettings = {
  displayName?: string;
};

export function getLearnerDisplayName(
  user?: LearnerNameUser | null,
  settings?: LearnerNameSettings | null
): string | null {
  const override = settings?.displayName?.trim();
  if (override) return override;

  const fromSession = getDisplayName(user);
  if (fromSession && fromSession !== "there") return fromSession;

  return null;
}

/** Lightweight Latin → katakana for TTS; returns null if input is empty or already kana-heavy. */
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
