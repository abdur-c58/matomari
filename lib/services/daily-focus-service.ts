import type { Dataset } from "@/types/sentence";
import type { BatchConfig, UserProgress } from "@/types/progress";
import {
  clampBatchSize,
  getBatchStarterCandidateIds,
  getInProgressActiveIdsForSource,
  isFormalStudyEligibleScene,
} from "@/lib/services/batch-service";
import {
  parseStudyUnitKey,
  studyUnitKey,
  type StudyUnitRef,
} from "@/lib/services/study-unit-service";

/** First-folder free try / featured scene — default study focus when nothing is active. */
export const DEFAULT_STUDY_SCENE_KEY = "premade_100_basic_sentences";
export const DEFAULT_STUDY_SCENE_TITLE = "100 Basic Sentences";

/** Legacy Plus default (300 Essentials) — still used when accessible. */
export const PLUS_DEFAULT_STUDY_SCENE_KEY = "premade_300_language_essentials";
export const PLUS_DEFAULT_STUDY_SCENE_TITLE = "300 Language Essentials";

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
      ref?.kind === "scene" &&
      isFormalStudyEligibleScene(dataset, ref.key)
    ) {
      return ref;
    }
  }
  return null;
}

export function getDefaultStudySceneKey(dataset: Dataset): string | null {
  if (isFormalStudyEligibleScene(dataset, DEFAULT_STUDY_SCENE_KEY)) {
    return DEFAULT_STUDY_SCENE_KEY;
  }

  for (const [key, scene] of Object.entries(dataset.scenes)) {
    if (
      scene.title?.trim() === DEFAULT_STUDY_SCENE_TITLE &&
      isFormalStudyEligibleScene(dataset, key)
    ) {
      return key;
    }
  }

  for (const key of Object.keys(dataset.scenes)) {
    if (isFormalStudyEligibleScene(dataset, key)) return key;
  }
  return null;
}

function synthesizeConfigFromSource(
  dataset: Dataset,
  progress: UserProgress,
  config: Omit<BatchConfig, "activeSentenceIds">
): BatchConfig | null {
  const batchSize = clampBatchSize(config.batchSize);

  if (config.sourceType === "scene" && config.sceneKey) {
    const snapshot = progress.sceneBatchSnapshots?.[config.sceneKey];
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

function buildSceneBatchConfig(
  dataset: Dataset,
  progress: UserProgress,
  sceneKey: string
): BatchConfig | null {
  if (!isFormalStudyEligibleScene(dataset, sceneKey)) return null;

  const base = {
    sourceType: "scene" as const,
    pathwayBatchNumber: null,
    sceneKey,
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

function isUsableSceneConfig(
  dataset: Dataset,
  config: BatchConfig | null
): config is BatchConfig {
  return Boolean(
    config &&
      config.sourceType === "scene" &&
      config.sceneKey &&
      isFormalStudyEligibleScene(dataset, config.sceneKey)
  );
}

/**
 * Always resolve an scene study batch when scenes exist.
 * Pathway configs are ignored; default is 300 Language Essentials.
 */
export function resolveDailyBatchConfig(
  dataset: Dataset | null,
  progress: UserProgress
): BatchConfig | null {
  if (!dataset) return null;

  if (isUsableSceneConfig(dataset, progress.batchConfig)) {
    if (progress.batchConfig.activeSentenceIds.length > 0) {
      return progress.batchConfig;
    }
    return buildSceneBatchConfig(dataset, progress, progress.batchConfig.sceneKey!);
  }

  const recent = getMostRecentStudyUnit(dataset, progress);
  if (recent?.kind === "scene") {
    const recentConfig = buildSceneBatchConfig(dataset, progress, recent.key);
    if (recentConfig && recentConfig.activeSentenceIds.length > 0) {
      return recentConfig;
    }
  }

  const defaultKey = getDefaultStudySceneKey(dataset);
  if (!defaultKey) return null;
  return buildSceneBatchConfig(dataset, progress, defaultKey);
}

export function withResolvedDailyBatch(
  dataset: Dataset | null,
  progress: UserProgress
): UserProgress | null {
  const config = resolveDailyBatchConfig(dataset, progress);
  if (!config) return null;
  if (
    isUsableSceneConfig(dataset!, progress.batchConfig) &&
    progress.batchConfig.activeSentenceIds.length > 0
  ) {
    return progress;
  }
  return { ...progress, batchConfig: config };
}

export function getReturnReviewIds(
  progress: UserProgress,
  sceneKey?: string | null
): string[] {
  const key =
    sceneKey ??
    (progress.batchConfig?.sourceType === "scene"
      ? progress.batchConfig.sceneKey
      : null);
  if (!key) return [];

  const snapshot = progress.sceneBatchSnapshots?.[key];
  if (!snapshot?.needsReturnReview) return [];

  return snapshot.activeSentenceIds.filter((id) => {
    const sp = progress.sentences[id];
    return sp?.meaningConfirmed === true;
  });
}

export function clearReturnReview(
  progress: UserProgress,
  sceneKey: string
): UserProgress {
  const snapshot = progress.sceneBatchSnapshots?.[sceneKey];
  if (!snapshot?.needsReturnReview) return progress;

  return {
    ...progress,
    sceneBatchSnapshots: {
      ...progress.sceneBatchSnapshots,
      [sceneKey]: { ...snapshot, needsReturnReview: false },
    },
  };
}

export function saveSceneBatchSnapshot(
  progress: UserProgress,
  sceneKey: string
): UserProgress {
  const config = progress.batchConfig;
  if (
    !config ||
    config.sourceType !== "scene" ||
    config.sceneKey !== sceneKey ||
    config.activeSentenceIds.length === 0
  ) {
    return progress;
  }

  return {
    ...progress,
    sceneBatchSnapshots: {
      ...progress.sceneBatchSnapshots,
      [sceneKey]: {
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
    "sourceType" | "pathwayBatchNumber" | "sceneKey" | "subtopic"
  >,
  b: Pick<
    BatchConfig,
    "sourceType" | "pathwayBatchNumber" | "sceneKey" | "subtopic"
  >
): boolean {
  if (a.sourceType !== b.sourceType) return false;
  if (a.sourceType === "pathway") {
    return a.pathwayBatchNumber === b.pathwayBatchNumber;
  }
  return a.sceneKey === b.sceneKey && a.subtopic === b.subtopic;
}

export function needsStudySwitch(
  progress: UserProgress,
  target: Pick<
    BatchConfig,
    "sourceType" | "pathwayBatchNumber" | "sceneKey" | "subtopic"
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
  if (config.sourceType === "scene" && config.sceneKey) {
    const titled = dataset?.scenes[config.sceneKey]?.title;
    return titled ?? config.sceneKey.replace(/_/g, " ");
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
  target: Pick<BatchConfig, "sourceType" | "pathwayBatchNumber" | "sceneKey">,
  dataset: Dataset | null
): string {
  if (target.sourceType === "scene" && target.sceneKey) {
    const titled = dataset?.scenes[target.sceneKey]?.title;
    return titled ?? target.sceneKey.replace(/_/g, " ");
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
  config: Pick<BatchConfig, "sourceType" | "sceneKey">
): StudyUnitRef {
  return config.sourceType === "pathway"
    ? { kind: "pathway" }
    : { kind: "scene", key: config.sceneKey! };
}

export { studyUnitKey };
