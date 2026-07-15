import type { Dataset } from "@/types/sentence";
import type { BatchConfig, UserProgress } from "@/types/progress";
import {
  clampBatchSize,
  getBatchStarterCandidateIds,
  getInProgressActiveIdsForSource,
  isFormalStudyEligibleIsland,
} from "@/lib/services/batch-service";
import {
  parseStudyUnitKey,
  studyUnitKey,
  type StudyUnitRef,
} from "@/lib/services/study-unit-service";

/** First-folder featured island — default study focus when nothing is active. */
export const DEFAULT_STUDY_ISLAND_KEY = "premade_300_language_essentials";
export const DEFAULT_STUDY_ISLAND_TITLE = "300 Language Essentials";

export function getMostRecentStudyUnit(
  dataset: Dataset,
  progress: UserProgress
): StudyUnitRef | null {
  const entries = Object.entries(progress.studyUnitLastOpened ?? {});
  if (entries.length === 0) return null;

  entries.sort(([, a], [, b]) => new Date(b).getTime() - new Date(a).getTime());
  for (const [key] of entries) {
    const ref = parseStudyUnitKey(key);
    if (
      ref?.kind === "island" &&
      isFormalStudyEligibleIsland(dataset, ref.key)
    ) {
      return ref;
    }
  }
  return null;
}

export function getDefaultStudyIslandKey(dataset: Dataset): string | null {
  if (isFormalStudyEligibleIsland(dataset, DEFAULT_STUDY_ISLAND_KEY)) {
    return DEFAULT_STUDY_ISLAND_KEY;
  }

  for (const [key, island] of Object.entries(dataset.islands)) {
    if (
      island.title?.trim() === DEFAULT_STUDY_ISLAND_TITLE &&
      isFormalStudyEligibleIsland(dataset, key)
    ) {
      return key;
    }
  }

  for (const key of Object.keys(dataset.islands)) {
    if (isFormalStudyEligibleIsland(dataset, key)) return key;
  }
  return null;
}

function synthesizeConfigFromSource(
  dataset: Dataset,
  progress: UserProgress,
  config: Omit<BatchConfig, "activeSentenceIds">
): BatchConfig | null {
  const batchSize = clampBatchSize(config.batchSize);

  if (config.sourceType === "island" && config.islandKey) {
    const snapshot = progress.islandBatchSnapshots?.[config.islandKey];
    if (snapshot?.activeSentenceIds.length) {
      return {
        ...config,
        batchSize,
        activeSentenceIds: snapshot.activeSentenceIds.slice(0, batchSize),
      };
    }
  }

  const inProgress = getInProgressActiveIdsForSource(dataset, progress, config);
  if (inProgress.length > 0) {
    return {
      ...config,
      batchSize,
      activeSentenceIds: inProgress.slice(0, batchSize),
    };
  }

  return null;
}

function buildIslandBatchConfig(
  dataset: Dataset,
  progress: UserProgress,
  islandKey: string
): BatchConfig | null {
  if (!isFormalStudyEligibleIsland(dataset, islandKey)) return null;

  const base = {
    sourceType: "island" as const,
    pathwayBatchNumber: null,
    islandKey,
    subtopic: null,
    batchSize: progress.settings.batchSize,
  };

  const synthesized = synthesizeConfigFromSource(dataset, progress, base);
  if (synthesized && synthesized.activeSentenceIds.length > 0) {
    return synthesized;
  }

  const batchSize = clampBatchSize(base.batchSize);
  const candidates = getBatchStarterCandidateIds(dataset, base, progress);
  return {
    ...base,
    batchSize,
    activeSentenceIds: candidates.slice(0, batchSize),
  };
}

function isUsableIslandConfig(
  dataset: Dataset,
  config: BatchConfig | null
): config is BatchConfig {
  return Boolean(
    config &&
      config.sourceType === "island" &&
      config.islandKey &&
      isFormalStudyEligibleIsland(dataset, config.islandKey)
  );
}

/**
 * Always resolve an island study batch when islands exist.
 * Pathway configs are ignored; default is 300 Language Essentials.
 */
export function resolveDailyBatchConfig(
  dataset: Dataset | null,
  progress: UserProgress
): BatchConfig | null {
  if (!dataset) return null;

  if (isUsableIslandConfig(dataset, progress.batchConfig)) {
    if (progress.batchConfig.activeSentenceIds.length > 0) {
      return progress.batchConfig;
    }
    return buildIslandBatchConfig(dataset, progress, progress.batchConfig.islandKey!);
  }

  const recent = getMostRecentStudyUnit(dataset, progress);
  if (recent?.kind === "island") {
    const recentConfig = buildIslandBatchConfig(dataset, progress, recent.key);
    if (recentConfig && recentConfig.activeSentenceIds.length > 0) {
      return recentConfig;
    }
  }

  const defaultKey = getDefaultStudyIslandKey(dataset);
  if (!defaultKey) return null;
  return buildIslandBatchConfig(dataset, progress, defaultKey);
}

export function withResolvedDailyBatch(
  dataset: Dataset | null,
  progress: UserProgress
): UserProgress | null {
  const config = resolveDailyBatchConfig(dataset, progress);
  if (!config) return null;
  if (
    isUsableIslandConfig(dataset!, progress.batchConfig) &&
    progress.batchConfig.activeSentenceIds.length > 0
  ) {
    return progress;
  }
  return { ...progress, batchConfig: config };
}

export function getReturnReviewIds(
  progress: UserProgress,
  islandKey?: string | null
): string[] {
  const key =
    islandKey ??
    (progress.batchConfig?.sourceType === "island"
      ? progress.batchConfig.islandKey
      : null);
  if (!key) return [];

  const snapshot = progress.islandBatchSnapshots?.[key];
  if (!snapshot?.needsReturnReview) return [];

  return snapshot.activeSentenceIds.filter((id) => {
    const sp = progress.sentences[id];
    return sp?.meaningConfirmed === true;
  });
}

export function clearReturnReview(
  progress: UserProgress,
  islandKey: string
): UserProgress {
  const snapshot = progress.islandBatchSnapshots?.[islandKey];
  if (!snapshot?.needsReturnReview) return progress;

  return {
    ...progress,
    islandBatchSnapshots: {
      ...progress.islandBatchSnapshots,
      [islandKey]: { ...snapshot, needsReturnReview: false },
    },
  };
}

export function saveIslandBatchSnapshot(
  progress: UserProgress,
  islandKey: string
): UserProgress {
  const config = progress.batchConfig;
  if (
    !config ||
    config.sourceType !== "island" ||
    config.islandKey !== islandKey ||
    config.activeSentenceIds.length === 0
  ) {
    return progress;
  }

  return {
    ...progress,
    islandBatchSnapshots: {
      ...progress.islandBatchSnapshots,
      [islandKey]: {
        activeSentenceIds: [...config.activeSentenceIds],
        switchedAwayAt: new Date().toISOString(),
        needsReturnReview: true,
      },
    },
  };
}

export function configsMatch(
  a: Pick<
    BatchConfig,
    "sourceType" | "pathwayBatchNumber" | "islandKey" | "subtopic"
  >,
  b: Pick<
    BatchConfig,
    "sourceType" | "pathwayBatchNumber" | "islandKey" | "subtopic"
  >
): boolean {
  if (a.sourceType !== b.sourceType) return false;
  if (a.sourceType === "pathway") {
    return a.pathwayBatchNumber === b.pathwayBatchNumber;
  }
  return a.islandKey === b.islandKey && a.subtopic === b.subtopic;
}

export function needsStudySwitch(
  progress: UserProgress,
  target: Pick<
    BatchConfig,
    "sourceType" | "pathwayBatchNumber" | "islandKey" | "subtopic"
  >
): boolean {
  const current = progress.batchConfig;
  if (!current) return false;
  if (configsMatch(current, target)) return false;

  const hasActiveWork = current.activeSentenceIds.some((id) => {
    const sp = progress.sentences[id];
    return (
      sp &&
      (sp.meaningConfirmed ||
        sp.recallHistory.length > 0 ||
        sp.rating !== null)
    );
  });

  return hasActiveWork || current.activeSentenceIds.length > 0;
}

export function getSwitchFromLabel(
  progress: UserProgress,
  dataset: Dataset | null
): string {
  const config = progress.batchConfig;
  if (!config) return "current study";
  if (config.sourceType === "island" && config.islandKey) {
    const titled = dataset?.islands[config.islandKey]?.title;
    return titled ?? config.islandKey.replace(/_/g, " ");
  }
  if (config.sourceType === "pathway" && config.pathwayBatchNumber !== null) {
    const batch = dataset?.main_pathway.batches.find(
      (b) => b.batch_number === config.pathwayBatchNumber
    );
    return batch?.batch_title ?? `Batch ${config.pathwayBatchNumber}`;
  }
  return "current study";
}

export function getSwitchToLabel(
  target: Pick<BatchConfig, "sourceType" | "pathwayBatchNumber" | "islandKey">,
  dataset: Dataset | null
): string {
  if (target.sourceType === "island" && target.islandKey) {
    const titled = dataset?.islands[target.islandKey]?.title;
    return titled ?? target.islandKey.replace(/_/g, " ");
  }
  if (target.sourceType === "pathway" && target.pathwayBatchNumber !== null) {
    const batch = dataset?.main_pathway.batches.find(
      (b) => b.batch_number === target.pathwayBatchNumber
    );
    return batch?.batch_title ?? `Batch ${target.pathwayBatchNumber}`;
  }
  return "new selection";
}

export function touchStudyUnitFromConfig(
  progress: UserProgress,
  config: Pick<BatchConfig, "sourceType" | "islandKey">
): StudyUnitRef {
  return config.sourceType === "pathway"
    ? { kind: "pathway" }
    : { kind: "island", key: config.islandKey! };
}

export { studyUnitKey };
