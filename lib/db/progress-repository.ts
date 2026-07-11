import type { SentenceProgress, UserProgress } from "@/types/progress";
import { DEFAULT_PROGRESS, getDB } from "./index";

const PROGRESS_KEY = "main";

export async function getProgress(): Promise<UserProgress> {
  try {
    const db = await getDB();
    const progress = await db.get("progress", PROGRESS_KEY);
    return progress ?? { ...DEFAULT_PROGRESS };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export async function saveProgress(progress: UserProgress): Promise<void> {
  const db = await getDB();
  await db.put("progress", progress, PROGRESS_KEY);
}

export async function getSentenceProgress(
  sentenceId: string
): Promise<SentenceProgress | null> {
  const progress = await getProgress();
  return progress.sentences[sentenceId] ?? null;
}

export async function updateSentenceProgress(
  sentenceId: string,
  update: Partial<SentenceProgress> | ((prev: SentenceProgress) => SentenceProgress)
): Promise<UserProgress> {
  const progress = await getProgress();
  const existing: SentenceProgress = progress.sentences[sentenceId] ?? {
    sentenceId,
    rating: null,
    recallHistory: [],
    meaningConfirmed: false,
    batchStatus: "unseen",
    srsNextReview: null,
    srsIntervalIndex: 0,
    retiredAt: null,
    firstSeenAt: null,
    masteredAt: null,
    sourceType: "pathway",
    sourceKey: "",
  };

  const updated =
    typeof update === "function"
      ? update(existing)
      : { ...existing, ...update };

  const next: UserProgress = {
    ...progress,
    sentences: { ...progress.sentences, [sentenceId]: updated },
  };
  await saveProgress(next);
  return next;
}

export async function bulkUpdateProgress(
  updater: (progress: UserProgress) => UserProgress
): Promise<UserProgress> {
  const progress = await getProgress();
  const next = updater(progress);
  await saveProgress(next);
  return next;
}
