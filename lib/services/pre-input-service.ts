import type { Dataset, Sentence } from "@/types/sentence";
import { getAllSentences } from "@/lib/validation/dataset-schema";
import { isTranslated } from "@/lib/sentence-utils";

function tokenizeJapanese(text: string): string[] {
  const segments = text
    .split(/[。！？\n\s、,.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const tokens = new Set<string>();
  for (const seg of segments) {
    tokens.add(seg);
    const words = seg.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g) ?? [];
    words.forEach((w) => tokens.add(w));
  }
  return Array.from(tokens);
}

function isKnown(token: string, knownSentences: Sentence[]): boolean {
  const normalized = token.trim();
  if (!normalized) return true;

  return knownSentences.some((s) => {
    if (!isTranslated(s) || !s.japanese) return false;
    if (s.japanese.includes(normalized)) return true;
    if (normalized.length >= 2 && s.japanese.indexOf(normalized) >= 0) return true;
    const jpTokens = s.japanese.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g) ?? [];
    return jpTokens.some((t) => t === normalized || normalized.includes(t));
  });
}

export interface UnknownItem {
  text: string;
  matchingSentences: Sentence[];
}

export function analyzeTranscript(
  transcript: string,
  dataset: Dataset | null
): UnknownItem[] {
  if (!dataset) return [];

  const allSentences = Array.from(getAllSentences(dataset).values());
  const knownActive = allSentences.filter((s) => {
    return true;
  });

  const tokens = tokenizeJapanese(transcript);
  const unknown: UnknownItem[] = [];

  for (const token of tokens) {
    if (isKnown(token, knownActive)) continue;

    const matches = allSentences.filter(
      (s) =>
        isTranslated(s) &&
        s.japanese &&
        (s.japanese.includes(token) ||
          token.includes(s.japanese.slice(0, Math.min(4, s.japanese.length))))
    );

    unknown.push({ text: token, matchingSentences: matches.slice(0, 5) });
  }

  const seen = new Set<string>();
  return unknown.filter((u) => {
    if (seen.has(u.text)) return false;
    seen.add(u.text);
    return true;
  });
}

export function findStudyCandidates(
  transcript: string,
  dataset: Dataset
): Sentence[] {
  const tokens = tokenizeJapanese(transcript);
  const all = Array.from(getAllSentences(dataset).values());
  const candidates = new Map<string, Sentence>();

  for (const token of tokens) {
    for (const s of all) {
      if (isTranslated(s) && s.japanese?.includes(token) && token.length >= 2) {
        candidates.set(s.id, s);
      }
    }
  }

  return Array.from(candidates.values());
}
