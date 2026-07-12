import type { SentenceProgress, UserProgress } from "@/types/progress";
import { DEFAULT_PROGRESS, getDB } from "./index";
import { clampBatchSize } from "@/lib/services/batch-service";
import { normalizeNotificationPreferences } from "@/lib/notifications/notification-service";
import { resolveTranslationSettings } from "@/lib/preferences/translation-preferences";
import {
  normalizeUserProgress,
  prepareProgressForSave,
} from "@/lib/progress/dialect-progress";

const PROGRESS_KEY = "main";

function normalizeSettings(progress: UserProgress): UserProgress["settings"] {
  const resolved = resolveTranslationSettings(progress.settings ?? {});
  return {
    batchSize: clampBatchSize(progress.settings?.batchSize),
    ...resolved,
    showKansaiDialect: resolved.showKansaiDialect ?? false,
    kansaiAsPrimary: resolved.kansaiAsPrimary ?? false,
    notifications: normalizeNotificationPreferences(progress.settings?.notifications),
    displayName: progress.settings?.displayName,
    japaneseNameReading: progress.settings?.japaneseNameReading,
    japaneseNameSource: progress.settings?.japaneseNameSource,
    onboardingCompleted: progress.settings?.onboardingCompleted,
    onboardingCompletedAt: progress.settings?.onboardingCompletedAt,
    uiFont: progress.settings?.uiFont,
  };
}

export async function getProgress(): Promise<UserProgress> {
  try {
    const db = await getDB();
    const progress = await db.get("progress", PROGRESS_KEY);
    if (!progress) return normalizeUserProgress({ ...DEFAULT_PROGRESS });
    return normalizeUserProgress({
      ...progress,
      settings: normalizeSettings(progress),
      sentences: progress.sentences ?? {},
      batchConfig: progress.batchConfig ?? null,
      completedPathwayBatches: progress.completedPathwayBatches ?? [],
      completedIslands: progress.completedIslands ?? [],
      byDialect: progress.byDialect,
    });
  } catch {
    return normalizeUserProgress({ ...DEFAULT_PROGRESS });
  }
}

export async function saveProgress(progress: UserProgress): Promise<void> {
  const db = await getDB();
  const prepared = prepareProgressForSave(progress);
  await db.put("progress", prepared, PROGRESS_KEY);
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

  const next = prepareProgressForSave({
    ...progress,
    sentences: { ...progress.sentences, [sentenceId]: updated },
  });
  await saveProgress(next);
  return next;
}

export async function bulkUpdateProgress(
  updater: (progress: UserProgress) => UserProgress
): Promise<UserProgress> {
  const progress = await getProgress();
  const next = prepareProgressForSave(updater(progress));
  await saveProgress(next);
  return next;
}
