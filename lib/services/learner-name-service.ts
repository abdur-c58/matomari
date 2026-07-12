import type { UserProgress } from "@/types/progress";
import { isValidKanaReading } from "@/lib/audio/tts-text";
import {
  fallbackJapaneseNameReading,
  getCachedJapaneseNameReading,
  getLearnerNameSource,
} from "@/lib/sentence/learner-name";

export class LearnerNameTranslationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LearnerNameTranslationError";
  }
}

export async function fetchJapaneseNameReading(name: string): Promise<string> {
  const res = await fetch("/api/ai/translate-name", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (res.status === 503) {
    throw new LearnerNameTranslationError("AI is not configured");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Name translation failed" }));
    throw new LearnerNameTranslationError(err.error ?? "Name translation failed");
  }

  const data = (await res.json()) as { kana: string };
  const kana = data.kana?.trim();
  if (!kana || !isValidKanaReading(kana)) {
    throw new LearnerNameTranslationError("Invalid kana response");
  }
  return kana;
}

export async function ensureJapaneseLearnerName(
  progress: UserProgress,
  source: string,
  setProgress: (p: UserProgress) => Promise<void>
): Promise<string | null> {
  const trimmed = source.trim();
  if (!trimmed) {
    if (progress.settings.japaneseNameReading || progress.settings.japaneseNameSource) {
      await setProgress({
        ...progress,
        settings: {
          ...progress.settings,
          japaneseNameReading: undefined,
          japaneseNameSource: undefined,
        },
      });
    }
    return null;
  }

  const cached = getCachedJapaneseNameReading(progress.settings, trimmed);
  if (cached) return cached;

  let kana: string | null = null;
  try {
    kana = await fetchJapaneseNameReading(trimmed);
  } catch {
    kana = fallbackJapaneseNameReading(trimmed);
  }

  if (!kana) return null;

  await setProgress({
    ...progress,
    settings: {
      ...progress.settings,
      japaneseNameReading: kana,
      japaneseNameSource: trimmed,
    },
  });

  return kana;
}

export function resolveJapaneseNameForUser(
  progress: UserProgress,
  user?: { name?: string | null; email?: string | null } | null
): string | null {
  const source = getLearnerNameSource(user, progress.settings);
  if (!source) return null;
  return (
    getCachedJapaneseNameReading(progress.settings, source) ??
    fallbackJapaneseNameReading(source)
  );
}
