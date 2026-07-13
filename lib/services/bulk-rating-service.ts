import type { Dataset } from "@/types/sentence";
import type { SentenceProgress, UserProgress } from "@/types/progress";
import { formatDateKey } from "@/lib/utils";
import { getAllSentences } from "@/lib/validation/dataset-schema";
import { applyRating } from "./rating-service";
import { scheduleRetirementSrs } from "./srs-service";
import {
  createDefaultSentenceProgress,
  getUnseenSentenceIds,
  isMastered,
  shouldRetire,
} from "./batch-service";
import {
  maybeMarkIslandComplete,
  maybeMarkPathwayBatchComplete,
} from "./study-focus-service";

export interface BulkRatingResult {
  progress: UserProgress;
  updatedCount: number;
  retiredCount: number;
  masteredCount: number;
}

function applyRetireFields(sp: SentenceProgress, today: string, rating: number): SentenceProgress {
  const srs = scheduleRetirementSrs(sp, rating);
  return {
    ...sp,
    batchStatus: "retired",
    retiredAt: today,
    ...srs,
  };
}

export function refillActiveBatchOnce(
  dataset: Dataset,
  progress: UserProgress
): UserProgress {
  const config = progress.batchConfig;
  if (!config) return progress;

  const today = formatDateKey();
  const sentences = { ...progress.sentences };
  const activeIds = [...config.activeSentenceIds];

  while (activeIds.length < config.batchSize) {
    const unseen = getUnseenSentenceIds(
      dataset,
      { ...config, activeSentenceIds: activeIds },
      { ...progress, sentences }
    );
    if (unseen.length === 0) break;

    const nextId = unseen[0];
    const existing = sentences[nextId];
    sentences[nextId] = {
      ...(existing ??
        createDefaultSentenceProgress(
          nextId,
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
    activeIds.push(nextId);
  }

  return {
    ...progress,
    sentences,
    batchConfig: { ...config, activeSentenceIds: activeIds },
  };
}

export function bulkApplySentenceRatings(
  dataset: Dataset,
  progress: UserProgress,
  sentenceIds: string[],
  rating: number
): BulkRatingResult {
  if (rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }

  const uniqueIds = [...new Set(sentenceIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return {
      progress,
      updatedCount: 0,
      retiredCount: 0,
      masteredCount: 0,
    };
  }

  const all = getAllSentences(dataset);
  const today = formatDateKey();
  const retiring = shouldRetire(rating);
  const sentences = { ...progress.sentences };
  let updatedCount = 0;
  let retiredCount = 0;
  let masteredCount = 0;
  const affectedIslandKeys = new Set<string>();
  const affectedPathwayBatches = new Set<number>();

  for (const id of uniqueIds) {
    const meta = all.get(id);
    if (!meta) continue;

    const sourceType = meta.sourceType;
    const sourceKey = meta.sourceKey;
    const existing = sentences[id];

    let sp = applyRating(
      existing ??
        createDefaultSentenceProgress(id, sourceType, sourceKey),
      rating
    );

    if (retiring) {
      sp = applyRetireFields(sp, today, rating);
      sp = { ...sp, meaningConfirmed: true };
      retiredCount++;
    }

    if (isMastered(rating)) {
      masteredCount++;
    }

    sentences[id] = sp;
    updatedCount++;

    if (sourceType === "island") {
      affectedIslandKeys.add(sourceKey);
    } else {
      const batchNumber = Number(sourceKey);
      if (!Number.isNaN(batchNumber)) {
        affectedPathwayBatches.add(batchNumber);
      }
    }
  }

  let nextProgress: UserProgress = { ...progress, sentences };

  if (nextProgress.batchConfig) {
    const ratedSet = new Set(uniqueIds);
    const activeIds = nextProgress.batchConfig.activeSentenceIds.filter(
      (id) => !ratedSet.has(id)
    );
    nextProgress = {
      ...nextProgress,
      batchConfig: { ...nextProgress.batchConfig, activeSentenceIds: activeIds },
    };
    nextProgress = refillActiveBatchOnce(dataset, nextProgress);
  }

  for (const batchNumber of affectedPathwayBatches) {
    nextProgress = maybeMarkPathwayBatchComplete(dataset, nextProgress, batchNumber);
  }

  for (const islandKey of affectedIslandKeys) {
    nextProgress = maybeMarkIslandComplete(dataset, nextProgress, islandKey);
  }

  return {
    progress: nextProgress,
    updatedCount,
    retiredCount,
    masteredCount,
  };
}

export function rateIslandSentences(
  dataset: Dataset,
  progress: UserProgress,
  islandKey: string,
  rating: number,
  options?: { subtopic?: string | null }
): BulkRatingResult {
  const island = dataset.islands[islandKey];
  if (!island) {
    return {
      progress,
      updatedCount: 0,
      retiredCount: 0,
      masteredCount: 0,
    };
  }

  const sentences =
    options?.subtopic != null
      ? island.sentences.filter((s) => s.subtopic === options.subtopic)
      : island.sentences;

  return bulkApplySentenceRatings(
    dataset,
    progress,
    sentences.map((s) => s.id),
    rating
  );
}
