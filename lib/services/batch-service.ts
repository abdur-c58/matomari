import type { Dataset, Sentence } from "@/types/sentence";
import type {
  BatchConfig,
  BatchSourceType,
  SentenceProgress,
  UserProgress,
} from "@/types/progress";
import {
  DEFAULT_BATCH_SIZE,
  MAX_BATCH_SIZE,
  MIN_BATCH_SIZE,
} from "@/lib/constants/study";
import { formatDateKey } from "@/lib/utils";
import { markPathwayBatchCompleteAfterRetire } from "./study-focus-service";
import { scheduleRetirementSrs } from "./srs-service";
import { getAllSentences } from "@/lib/validation/dataset-schema";

function getBatchSourceKey(config: Pick<BatchConfig, "sourceType" | "pathwayBatchNumber" | "sceneKey">): string {
  return config.sourceType === "pathway"
    ? String(config.pathwayBatchNumber)
    : config.sceneKey ?? "";
}

export function isFormalStudyEligibleScene(
  dataset: Dataset,
  sceneKey: string | null | undefined
): boolean {
  if (!sceneKey) return false;
  const scene = dataset.scenes[sceneKey];
  return Boolean(scene && scene.format !== "narration");
}

function isFormalStudyEligibleConfig(
  dataset: Dataset,
  config: Pick<BatchConfig, "sourceType" | "sceneKey">
): boolean {
  return (
    config.sourceType !== "scene" ||
    isFormalStudyEligibleScene(dataset, config.sceneKey)
  );
}

export function clampBatchSize(size: number | undefined | null): number {
  const n = Number(size);
  if (!Number.isFinite(n)) return DEFAULT_BATCH_SIZE;
  return Math.max(MIN_BATCH_SIZE, Math.min(MAX_BATCH_SIZE, Math.round(n)));
}

function matchesBatchSource(
  sp: SentenceProgress,
  config: Pick<BatchConfig, "sourceType" | "pathwayBatchNumber" | "sceneKey">
): boolean {
  return (
    sp.sourceType === config.sourceType &&
    sp.sourceKey === getBatchSourceKey(config)
  );
}

export function createDefaultSentenceProgress(
  sentenceId: string,
  sourceType: BatchSourceType,
  sourceKey: string
): SentenceProgress {
  return {
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
    sourceType,
    sourceKey,
  };
}

export function getSentencesFromSource(
  dataset: Dataset,
  config: Pick<
    BatchConfig,
    "sourceType" | "pathwayBatchNumber" | "sceneKey" | "subtopic"
  >
): Sentence[] {
  if (config.sourceType === "pathway" && config.pathwayBatchNumber !== null) {
    const batch = dataset.main_pathway.batches.find(
      (b) => b.batch_number === config.pathwayBatchNumber
    );
    return batch?.sentences ?? [];
  }

  if (config.sourceType === "scene" && config.sceneKey) {
    if (!isFormalStudyEligibleScene(dataset, config.sceneKey)) return [];
    const scene = dataset.scenes[config.sceneKey];
    if (!scene) return [];
    if (config.subtopic) {
      return scene.sentences.filter((s) => s.subtopic === config.subtopic);
    }
    return scene.sentences;
  }

  return [];
}

export function getUnseenSentenceIds(
  dataset: Dataset,
  config: BatchConfig,
  progress: UserProgress
): string[] {
  const activeSet = new Set(config.activeSentenceIds);
  return getSentencesFromSource(dataset, config)
    .map((s) => s.id)
    .filter((id) => {
      if (activeSet.has(id)) return false;
      const sp = progress.sentences[id];
      if (!sp || sp.batchStatus === "unseen") return true;
      // Active/retired from another mode (e.g. recall without a batch) — still available here.
      if (sp.batchStatus === "active" && !matchesBatchSource(sp, config)) return true;
      if (sp.batchStatus === "retired" && !matchesBatchSource(sp, config)) return true;
      return false;
    });
}

/** Sentences eligible when the user explicitly starts or restarts a batch. */
export function getBatchStarterCandidateIds(
  dataset: Dataset,
  config: Omit<BatchConfig, "activeSentenceIds">,
  progress: UserProgress
): string[] {
  const sourceIds = getSentencesFromSource(dataset, config).map((s) => s.id);
  const unseen: string[] = [];
  const active: string[] = [];
  const retired: string[] = [];

  for (const id of sourceIds) {
    const sp = progress.sentences[id];
    if (!sp || sp.batchStatus === "unseen") {
      unseen.push(id);
    } else if (sp.batchStatus === "active") {
      active.push(id);
    } else if (sp.batchStatus === "retired") {
      retired.push(id);
    }
  }

  return [...unseen, ...active, ...retired];
}

function buildBatchFromIds(
  dataset: Dataset,
  config: Omit<BatchConfig, "activeSentenceIds">,
  progress: UserProgress,
  activeIds: string[]
): { config: BatchConfig; progress: UserProgress } {
  const batchSize = clampBatchSize(config.batchSize);
  const ids = activeIds.slice(0, batchSize);
  const today = formatDateKey();
  const sentences = { ...progress.sentences };
  const sourceKey =
    config.sourceType === "pathway"
      ? String(config.pathwayBatchNumber)
      : config.sceneKey ?? "";

  for (const id of ids) {
    const existing = sentences[id];
    sentences[id] = {
      ...(existing ??
        createDefaultSentenceProgress(id, config.sourceType, sourceKey)),
      batchStatus: "active",
      firstSeenAt: existing?.firstSeenAt ?? today,
      sourceType: config.sourceType,
      sourceKey,
    };
  }

  const fullConfig = { ...config, batchSize, activeSentenceIds: ids };
  return {
    config: fullConfig,
    progress: {
      ...progress,
      batchConfig: fullConfig,
      sentences,
    },
  };
}

export function resumeOrInitializeBatch(
  dataset: Dataset,
  config: Omit<BatchConfig, "activeSentenceIds">,
  progress: UserProgress
): { config: BatchConfig; progress: UserProgress } {
  const batchSize = clampBatchSize(config.batchSize);
  const normalized = { ...config, batchSize };

  if (!isFormalStudyEligibleConfig(dataset, normalized)) {
    return {
      config: { ...normalized, activeSentenceIds: [] },
      progress,
    };
  }

  if (normalized.sourceType === "scene" && normalized.sceneKey) {
    const snapshot = progress.sceneBatchSnapshots?.[normalized.sceneKey];
    if (snapshot?.activeSentenceIds.length) {
      return buildBatchFromIds(
        dataset,
        normalized,
        progress,
        snapshot.activeSentenceIds
      );
    }
  }

  const inProgress = getInProgressActiveIdsForSource(
    dataset,
    progress,
    normalized
  );
  if (inProgress.length > 0) {
    return buildBatchFromIds(dataset, normalized, progress, inProgress);
  }

  return initializeBatch(dataset, normalized, progress);
}

export function getInProgressActiveIdsForSource(
  dataset: Dataset,
  progress: UserProgress,
  config: Pick<
    BatchConfig,
    "sourceType" | "pathwayBatchNumber" | "sceneKey" | "subtopic"
  >
): string[] {
  const sourceKey = getBatchSourceKey(config);
  const sourceIds = new Set(
    getSentencesFromSource(dataset, config).map((s) => s.id)
  );

  return Object.values(progress.sentences)
    .filter(
      (sp) =>
        sp.batchStatus === "active" &&
        sp.sourceType === config.sourceType &&
        sp.sourceKey === sourceKey &&
        sourceIds.has(sp.sentenceId)
    )
    .map((sp) => sp.sentenceId);
}

export function initializeBatch(
  dataset: Dataset,
  config: Omit<BatchConfig, "activeSentenceIds">,
  progress: UserProgress
): { config: BatchConfig; progress: UserProgress } {
  const batchSize = clampBatchSize(config.batchSize);
  if (!isFormalStudyEligibleConfig(dataset, config)) {
    return {
      config: { ...config, batchSize, activeSentenceIds: [] },
      progress,
    };
  }

  const candidates = getBatchStarterCandidateIds(dataset, config, progress);
  const activeIds = candidates.slice(0, batchSize);
  const today = formatDateKey();
  const sentences = { ...progress.sentences };

  for (const id of activeIds) {
    const all = getAllSentences(dataset);
    const meta = all.get(id);
    const existing = sentences[id];
    sentences[id] = {
      ...(existing ?? createDefaultSentenceProgress(
        id,
        config.sourceType,
        config.sourceType === "pathway"
          ? String(config.pathwayBatchNumber)
          : config.sceneKey ?? ""
      )),
      batchStatus: "active",
      firstSeenAt: existing?.firstSeenAt ?? today,
      sourceType: config.sourceType,
      sourceKey:
        config.sourceType === "pathway"
          ? String(config.pathwayBatchNumber)
          : config.sceneKey ?? "",
    };
  }

  return {
    config: { ...config, batchSize, activeSentenceIds: activeIds },
    progress: {
      ...progress,
      batchConfig: { ...config, batchSize, activeSentenceIds: activeIds },
      sentences,
    },
  };
}

export function retireSentence(
  dataset: Dataset,
  progress: UserProgress,
  sentenceId: string
): UserProgress {
  const config = progress.batchConfig;
  if (!config) return progress;

  const today = formatDateKey();
  const sentences = { ...progress.sentences };
  const sp = sentences[sentenceId];
  if (!sp) return progress;

  if (sp.batchStatus === "retired") {
    return progress;
  }

  const srs = scheduleRetirementSrs(sp, sp.rating ?? 4);

  sentences[sentenceId] = {
    ...sp,
    batchStatus: "retired",
    retiredAt: today,
    ...srs,
  };

  const activeIds = config.activeSentenceIds.filter((id) => id !== sentenceId);
  const unseen = getUnseenSentenceIds(
    dataset,
    { ...config, activeSentenceIds: activeIds },
    { ...progress, sentences }
  );

  if (unseen.length > 0 && activeIds.length < config.batchSize) {
    const nextId = unseen[0];
    const existing = sentences[nextId];
    sentences[nextId] = {
      ...(existing ?? createDefaultSentenceProgress(
        nextId,
        config.sourceType,
        config.sourceType === "pathway"
          ? String(config.pathwayBatchNumber)
          : config.sceneKey ?? ""
      )),
      batchStatus: "active",
      firstSeenAt: existing?.firstSeenAt ?? today,
    };
    activeIds.push(nextId);
  }

  const nextProgress = {
    ...progress,
    sentences,
    batchConfig: { ...config, activeSentenceIds: activeIds },
  };

  return markPathwayBatchCompleteAfterRetire(dataset, nextProgress, sentenceId);
}

export function getActiveBatchSentences(
  dataset: Dataset,
  progress: UserProgress,
  config?: BatchConfig | null
): Sentence[] {
  const activeConfig = config ?? progress.batchConfig;
  if (!activeConfig) return [];
  if (!isFormalStudyEligibleConfig(dataset, activeConfig)) return [];
  const all = getAllSentences(dataset);
  return activeConfig.activeSentenceIds
    .map((id) => all.get(id))
    .filter((s): s is NonNullable<typeof s> => !!s);
}

export function getActiveBatchIds(
  progress: UserProgress,
  config?: BatchConfig | null
): string[] {
  return (config ?? progress.batchConfig)?.activeSentenceIds ?? [];
}

export function shouldRetire(rating: number | null): boolean {
  return rating !== null && rating >= 4;
}

export function isMastered(rating: number | null): boolean {
  return rating === 5;
}
