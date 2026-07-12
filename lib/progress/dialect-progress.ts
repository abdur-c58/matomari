import type { Dialect } from "@/lib/constants/dialect";
import { DIALECTS, DEFAULT_DIALECT } from "@/lib/constants/dialect";
import type { AppSettings, UserProgress } from "@/types/progress";

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

/** Sync the active dialect's study fields into `byDialect` before persisting. */
export function prepareProgressForSave(progress: UserProgress): UserProgress {
  const dialect = progress.settings.dialect;
  return {
    ...progress,
    byDialect: {
      ...progress.byDialect,
      [dialect]: extractStudySlice(progress),
    },
  };
}

/** Migrate legacy flat progress and align top-level fields with the active dialect. */
export function normalizeUserProgress(progress: UserProgress): UserProgress {
  const dialect = progress.settings.dialect ?? DEFAULT_DIALECT;
  let byDialect = { ...progress.byDialect };

  const topLevelSlice = extractStudySlice(progress);

  if (!progress.byDialect && hasStudyData(topLevelSlice)) {
    byDialect[dialect] = topLevelSlice;
  }

  for (const d of DIALECTS) {
    if (!byDialect[d]) {
      byDialect[d] = emptyDialectStudyProgress();
    }
  }

  const activeSlice = byDialect[dialect] ?? emptyDialectStudyProgress();

  return applyStudySlice({ ...progress, byDialect }, activeSlice);
}

/** Save current dialect progress and load the target dialect's study state. */
export function switchDialectProgress(
  current: UserProgress,
  nextDialect: Dialect,
  settingsOverride?: Partial<AppSettings>
): UserProgress {
  const currentDialect = current.settings.dialect;
  const settings: AppSettings = {
    ...current.settings,
    ...settingsOverride,
    dialect: nextDialect,
  };

  if (currentDialect === nextDialect) {
    return prepareProgressForSave({ ...current, settings });
  }

  const byDialect = {
    ...(current.byDialect ?? {}),
    [currentDialect]: extractStudySlice(current),
  };

  for (const d of DIALECTS) {
    if (!byDialect[d]) {
      byDialect[d] = emptyDialectStudyProgress();
    }
  }

  const nextSlice = byDialect[nextDialect] ?? emptyDialectStudyProgress();

  return applyStudySlice({ ...current, byDialect, settings }, nextSlice);
}

/** Apply a settings update, swapping study progress when the dialect changes. */
export function applyProgressSettingsUpdate(
  current: UserProgress,
  nextSettings: AppSettings
): UserProgress {
  if (nextSettings.dialect === current.settings.dialect) {
    return prepareProgressForSave({ ...current, settings: nextSettings });
  }
  return switchDialectProgress(current, nextSettings.dialect, nextSettings);
}
