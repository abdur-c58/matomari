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
import { getAllSentences } from "@/lib/validation/dataset-schema";

function getBatchSourceKey(config: Pick<BatchConfig, "sourceType" | "pathwayBatchNumber" | "islandKey">): string {
  return config.sourceType === "pathway"
    ? String(config.pathwayBatchNumber)
    : config.islandKey ?? "";
}

export function clampBatchSize(size: number | undefined | null): number {
  const n = Number(size);
  if (!Number.isFinite(n)) return DEFAULT_BATCH_SIZE;
  return Math.max(MIN_BATCH_SIZE, Math.min(MAX_BATCH_SIZE, Math.round(n)));
}

function matchesBatchSource(
  sp: SentenceProgress,
  config: Pick<BatchConfig, "sourceType" | "pathwayBatchNumber" | "islandKey">
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
    "sourceType" | "pathwayBatchNumber" | "islandKey" | "subtopic"
  >
): Sentence[] {
  if (config.sourceType === "pathway" && config.pathwayBatchNumber !== null) {
    const batch = dataset.main_pathway.batches.find(
      (b) => b.batch_number === config.pathwayBatchNumber
    );
    return batch?.sentences ?? [];
  }

  if (config.sourceType === "island" && config.islandKey) {
    const island = dataset.islands[config.islandKey];
    if (!island) return [];
    if (config.subtopic) {
      return island.sentences.filter((s) => s.subtopic === config.subtopic);
    }
    return island.sentences;
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

export function initializeBatch(
  dataset: Dataset,
  config: Omit<BatchConfig, "activeSentenceIds">,
  progress: UserProgress
): { config: BatchConfig; progress: UserProgress } {
  const batchSize = clampBatchSize(config.batchSize);
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
          : config.islandKey ?? ""
      )),
      batchStatus: "active",
      firstSeenAt: existing?.firstSeenAt ?? today,
      sourceType: config.sourceType,
      sourceKey:
        config.sourceType === "pathway"
          ? String(config.pathwayBatchNumber)
          : config.islandKey ?? "",
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

  sentences[sentenceId] = {
    ...sp,
    batchStatus: "retired",
    retiredAt: today,
    srsNextReview: today,
    srsIntervalIndex: 0,
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
          : config.islandKey ?? ""
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
  progress: UserProgress
): Sentence[] {
  const config = progress.batchConfig;
  if (!config) return [];
  const all = getAllSentences(dataset);
  return config.activeSentenceIds
    .map((id) => all.get(id))
    .filter((s): s is NonNullable<typeof s> => !!s);
}

export function getActiveBatchIds(progress: UserProgress): string[] {
  return progress.batchConfig?.activeSentenceIds ?? [];
}

export function shouldRetire(rating: number | null): boolean {
  return rating !== null && rating >= 4;
}

export function isMastered(rating: number | null): boolean {
  return rating === 5;
}
