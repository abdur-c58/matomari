import type { Dataset } from "@/types/sentence";
import type { BatchConfig, UserProgress } from "@/types/progress";
import {
  clampBatchSize,
  getBatchStarterCandidateIds,
  getInProgressActiveIdsForSource,
} from "@/lib/services/batch-service";
import { getSuggestedPathwayBatch } from "@/lib/services/study-focus-service";
import {
  parseStudyUnitKey,
  studyUnitKey,
  type StudyUnitRef,
} from "@/lib/services/study-unit-service";

export function getMostRecentStudyUnit(progress: UserProgress): StudyUnitRef | null {
  const entries = Object.entries(progress.studyUnitLastOpened ?? {});
  if (entries.length === 0) return null;

  entries.sort(([, a], [, b]) => new Date(b).getTime() - new Date(a).getTime());
  for (const [key] of entries) {
    const ref = parseStudyUnitKey(key);
    if (ref) return ref;
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

function buildPathwayBatchConfig(
  dataset: Dataset,
  progress: UserProgress,
  batchNumber: number
): BatchConfig {
  const base = {
    sourceType: "pathway" as const,
    pathwayBatchNumber: batchNumber,
    islandKey: null,
    subtopic: null,
    batchSize: progress.settings.batchSize,
  };

  const synthesized = synthesizeConfigFromSource(dataset, progress, base);
  if (synthesized) return synthesized;

  const batchSize = clampBatchSize(base.batchSize);
  const candidates = getBatchStarterCandidateIds(dataset, base, progress);
  return {
    ...base,
    batchSize,
    activeSentenceIds: candidates.slice(0, batchSize),
  };
}

export function resolveDailyBatchConfig(
  dataset: Dataset | null,
  progress: UserProgress
): BatchConfig | null {
  if (!dataset) return null;
  if (progress.batchConfig) return progress.batchConfig;

  const recent = getMostRecentStudyUnit(progress);

  if (recent?.kind === "island") {
    const islandConfig = synthesizeConfigFromSource(dataset, progress, {
      sourceType: "island",
      islandKey: recent.key,
      pathwayBatchNumber: null,
      subtopic: null,
      batchSize: progress.settings.batchSize,
    });
    if (islandConfig) return islandConfig;
  }

  const pathwayActive = Object.values(progress.sentences).filter(
    (sp) => sp.batchStatus === "active" && sp.sourceType === "pathway"
  );
  if (pathwayActive.length > 0) {
    const batchNumber = Number(pathwayActive[0].sourceKey);
    if (Number.isFinite(batchNumber)) {
      const pathwayConfig = buildPathwayBatchConfig(dataset, progress, batchNumber);
      if (pathwayConfig.activeSentenceIds.length > 0) return pathwayConfig;
    }
  }

  const suggestedBatch = getSuggestedPathwayBatch(dataset, progress);
  return buildPathwayBatchConfig(dataset, progress, suggestedBatch);
}

export function withResolvedDailyBatch(
  dataset: Dataset | null,
  progress: UserProgress
): UserProgress | null {
  const config = resolveDailyBatchConfig(dataset, progress);
  if (!config) return null;
  if (progress.batchConfig) return progress;
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
    return config.islandKey.replace(/_/g, " ");
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
    return target.islandKey.replace(/_/g, " ");
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
