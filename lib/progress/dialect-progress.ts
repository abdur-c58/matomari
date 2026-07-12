import type { Dialect } from "@/lib/constants/dialect";
import { DIALECTS } from "@/lib/constants/dialect";
import type {
  AppSettings,
  BatchStatus,
  RecallAttempt,
  SentenceProgress,
  UserProgress,
} from "@/types/progress";
import { resolveTranslationSettings } from "@/lib/preferences/translation-preferences";

export interface DialectStudyProgress {
  sentences: UserProgress["sentences"];
  batchConfig: UserProgress["batchConfig"];
  completedPathwayBatches: UserProgress["completedPathwayBatches"];
  completedIslands: UserProgress["completedIslands"];
}

export function emptyDialectStudyProgress(): DialectStudyProgress {
  return {
    sentences: {},
    batchConfig: null,
    completedPathwayBatches: [],
    completedIslands: [],
  };
}

export function extractStudySlice(progress: UserProgress): DialectStudyProgress {
  return {
    sentences: progress.sentences ?? {},
    batchConfig: progress.batchConfig ?? null,
    completedPathwayBatches: progress.completedPathwayBatches ?? [],
    completedIslands: progress.completedIslands ?? [],
  };
}

export function applyStudySlice(
  progress: UserProgress,
  slice: DialectStudyProgress
): UserProgress {
  return {
    ...progress,
    sentences: slice.sentences,
    batchConfig: slice.batchConfig,
    completedPathwayBatches: slice.completedPathwayBatches,
    completedIslands: slice.completedIslands,
  };
}

function hasStudyData(slice: DialectStudyProgress): boolean {
  return (
    Object.keys(slice.sentences).length > 0 ||
    slice.batchConfig != null ||
    slice.completedPathwayBatches.length > 0 ||
    slice.completedIslands.length > 0
  );
}

const BATCH_STATUS_RANK: Record<BatchStatus, number> = {
  active: 3,
  unseen: 2,
  retired: 1,
};

function mergeBatchStatus(a: BatchStatus, b: BatchStatus): BatchStatus {
  return BATCH_STATUS_RANK[a] >= BATCH_STATUS_RANK[b] ? a : b;
}

function mergeRating(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.max(a, b);
}

function mergeRecallHistory(
  a: RecallAttempt[],
  b: RecallAttempt[]
): RecallAttempt[] {
  const seen = new Set<string>();
  const merged = [...a, ...b]
    .sort((x, y) => x.date.localeCompare(y.date))
    .filter((attempt) => {
      const key = `${attempt.date}|${attempt.correct}|${attempt.hesitation ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return merged;
}

function mergeSentenceProgress(
  a: SentenceProgress,
  b: SentenceProgress
): SentenceProgress {
  const rating = mergeRating(a.rating, b.rating);
  const batchStatus = mergeBatchStatus(a.batchStatus, b.batchStatus);
  const srsIntervalIndex = Math.max(a.srsIntervalIndex, b.srsIntervalIndex);

  let srsNextReview = a.srsNextReview;
  if (b.srsNextReview && (!srsNextReview || b.srsNextReview > srsNextReview)) {
    srsNextReview = b.srsNextReview;
  }

  const firstSeenAt =
    a.firstSeenAt && b.firstSeenAt
      ? a.firstSeenAt < b.firstSeenAt
        ? a.firstSeenAt
        : b.firstSeenAt
      : a.firstSeenAt ?? b.firstSeenAt;

  const masteredAt =
    a.masteredAt && b.masteredAt
      ? a.masteredAt > b.masteredAt
        ? a.masteredAt
        : b.masteredAt
      : a.masteredAt ?? b.masteredAt;

  const retiredAt =
    a.retiredAt && b.retiredAt
      ? a.retiredAt > b.retiredAt
        ? a.retiredAt
        : b.retiredAt
      : a.retiredAt ?? b.retiredAt;

  return {
    sentenceId: a.sentenceId,
    rating,
    recallHistory: mergeRecallHistory(a.recallHistory, b.recallHistory),
    meaningConfirmed: a.meaningConfirmed || b.meaningConfirmed,
    batchStatus,
    srsNextReview,
    srsIntervalIndex,
    retiredAt,
    firstSeenAt,
    masteredAt,
    sourceType: a.sourceType || b.sourceType,
    sourceKey: a.sourceKey || b.sourceKey,
  };
}

function mergeDialectSlices(
  slices: Partial<Record<Dialect, DialectStudyProgress>>,
  preferredDialect: Dialect
): DialectStudyProgress {
  const preferred = slices[preferredDialect] ?? emptyDialectStudyProgress();
  const merged: DialectStudyProgress = { ...preferred, sentences: { ...preferred.sentences } };

  for (const dialect of DIALECTS) {
    if (dialect === preferredDialect) continue;
    const slice = slices[dialect];
    if (!slice) continue;

    for (const [id, sp] of Object.entries(slice.sentences)) {
      if (merged.sentences[id]) {
        merged.sentences[id] = mergeSentenceProgress(merged.sentences[id], sp);
      } else {
        merged.sentences[id] = sp;
      }
    }

    if (!merged.batchConfig && slice.batchConfig) {
      merged.batchConfig = slice.batchConfig;
    }

    merged.completedPathwayBatches = [
      ...new Set([...merged.completedPathwayBatches, ...slice.completedPathwayBatches]),
    ].sort((a, b) => a - b);

    merged.completedIslands = [
      ...new Set([...merged.completedIslands, ...slice.completedIslands]),
    ];
  }

  if (!merged.batchConfig) {
    for (const dialect of DIALECTS) {
      const cfg = slices[dialect]?.batchConfig;
      if (cfg) {
        merged.batchConfig = cfg;
        break;
      }
    }
  }

  return merged;
}

function normalizeSettings(settings: AppSettings): AppSettings {
  const resolved = resolveTranslationSettings(settings);
  return {
    ...settings,
    ...resolved,
  };
}

/** One-time merge of per-dialect progress into unified top-level study state. */
function migrateUnifiedProgress(progress: UserProgress): UserProgress {
  const byDialect = progress.byDialect;
  if (!byDialect) return progress;

  const hasMultipleSlices = DIALECTS.some(
    (d) => d !== progress.settings.dialect && hasStudyData(byDialect[d] ?? emptyDialectStudyProgress())
  );

  if (!hasMultipleSlices && !hasStudyData(extractStudySlice(progress))) {
    const preferred = progress.settings.dialect ?? "standard";
    const slice = byDialect[preferred] ?? emptyDialectStudyProgress();
    return applyStudySlice(progress, slice);
  }

  const topLevel = extractStudySlice(progress);
  const slices: Partial<Record<Dialect, DialectStudyProgress>> = { ...byDialect };

  if (hasStudyData(topLevel)) {
    slices[progress.settings.dialect ?? "standard"] = topLevel;
  }

  const merged = mergeDialectSlices(slices, progress.settings.dialect ?? "standard");
  return applyStudySlice(progress, merged);
}

/** Normalize settings, migrate legacy dialect fields, and merge per-dialect progress. */
export function normalizeUserProgress(progress: UserProgress): UserProgress {
  const settings = normalizeSettings(progress.settings);
  const withSettings = { ...progress, settings };
  return migrateUnifiedProgress(withSettings);
}

/** Persist progress — no per-dialect slice syncing. */
export function prepareProgressForSave(progress: UserProgress): UserProgress {
  const settings = normalizeSettings(progress.settings);
  return { ...progress, settings };
}

/** @deprecated No longer swaps study state — kept for call-site compat during refactor. */
export function applyProgressSettingsUpdate(
  current: UserProgress,
  nextSettings: AppSettings
): UserProgress {
  return prepareProgressForSave({ ...current, settings: nextSettings });
}
