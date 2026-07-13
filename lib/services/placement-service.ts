import type { Dataset, Sentence } from "@/types/sentence";
import type { PlacementLevel, PlacementResult, UserProgress } from "@/types/progress";
import {
  PLACEMENT_STARTING_BATCH,
  PATHWAY_BATCH_COUNT,
  PROBE_BUMP_DOWN_THRESHOLD,
  PROBE_BUMP_UP_THRESHOLD,
  PROBE_SCORE,
  type ProbeRating,
} from "@/lib/constants/pathway-placement";
import { bulkApplySentenceRatings } from "./bulk-rating-service";

export function startingBatchFromLevel(level: PlacementLevel): number {
  return PLACEMENT_STARTING_BATCH[level];
}

export function clampPathwayBatch(batch: number): number {
  return Math.min(PATHWAY_BATCH_COUNT, Math.max(1, Math.round(batch)));
}

export function refineStartingBatch(
  selfAssessedBatch: number,
  probeRatings: ProbeRating[]
): { startingBatch: number; probeAdjustments: number } {
  const net = probeRatings.reduce((sum, r) => sum + PROBE_SCORE[r], 0);
  let startingBatch = selfAssessedBatch;
  if (net >= PROBE_BUMP_UP_THRESHOLD) startingBatch += 1;
  else if (net <= PROBE_BUMP_DOWN_THRESHOLD) startingBatch -= 1;
  return { startingBatch: clampPathwayBatch(startingBatch), probeAdjustments: net };
}

function hashSeed(parts: (string | number)[]): number {
  let h = 0;
  for (const p of parts) {
    const s = String(p);
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
  }
  return Math.abs(h);
}

function pickSentencesFromBatch(
  sentences: Sentence[],
  count: number,
  seed: number
): Sentence[] {
  const eligible = sentences.filter((s) => s.english?.trim());
  if (eligible.length === 0) return [];

  const bySubtopic = new Map<string, Sentence[]>();
  for (const s of eligible) {
    const key = s.subtopic || "general";
    const list = bySubtopic.get(key) ?? [];
    list.push(s);
    bySubtopic.set(key, list);
  }

  const picked: Sentence[] = [];
  const usedIds = new Set<string>();
  const subtopics = [...bySubtopic.keys()].sort();

  let round = 0;
  while (picked.length < count && round < count * 3) {
    for (const subtopic of subtopics) {
      if (picked.length >= count) break;
      const pool = bySubtopic.get(subtopic) ?? [];
      if (pool.length === 0) continue;
      const idx = (seed + round * 17 + picked.length * 7) % pool.length;
      const candidate = pool[idx];
      if (!usedIds.has(candidate.id)) {
        picked.push(candidate);
        usedIds.add(candidate.id);
      }
    }
    round++;
  }

  return picked.slice(0, count);
}

/** Six sentences: two each from batches (start−1), start, (start+1). */
export function selectProbeSentences(
  dataset: Dataset,
  startingBatch: number
): Sentence[] {
  const batches = dataset.main_pathway.batches;
  const result: Sentence[] = [];

  for (const offset of [-1, 0, 1]) {
    const batchNum = clampPathwayBatch(startingBatch + offset);
    const batch = batches.find((b) => b.batch_number === batchNum);
    if (!batch) continue;
    const seed = hashSeed([startingBatch, batchNum, offset]);
    result.push(...pickSentencesFromBatch(batch.sentences, 2, seed));
  }

  return result.slice(0, 6);
}

export function getSkippedBatchNumbers(startingBatch: number): number[] {
  if (startingBatch <= 1) return [];
  return Array.from({ length: startingBatch - 1 }, (_, i) => i + 1);
}

function collectSkippableSentenceIds(
  dataset: Dataset,
  progress: UserProgress,
  startingBatch: number,
  retake: boolean
): string[] {
  const ids: string[] = [];
  for (let batchNum = 1; batchNum < startingBatch; batchNum++) {
    const batch = dataset.main_pathway.batches.find((b) => b.batch_number === batchNum);
    if (!batch) continue;
    for (const s of batch.sentences) {
      const sp = progress.sentences[s.id];
      if (retake && sp && (sp.recallHistory.length > 0 || sp.batchStatus !== "unseen")) {
        continue;
      }
      ids.push(s.id);
    }
  }
  return ids;
}

export function getPlacementStartingBatch(progress: UserProgress): number | null {
  if (!progress.settings.placementCompleted || !progress.settings.placement) return null;
  return progress.settings.placement.startingBatch;
}

export function shouldShowPlacement(progress: UserProgress): boolean {
  return progress.settings.placementCompleted === false;
}

export function applyPathwayPlacement(
  dataset: Dataset,
  progress: UserProgress,
  input: {
    level: PlacementLevel;
    levelMode: "fluency" | "jlpt";
    startingBatch: number;
    probeAdjustments?: number;
    retake?: boolean;
  }
): {
  progress: UserProgress;
  placement: PlacementResult;
  skippedSentenceCount: number;
} {
  const startingBatch = clampPathwayBatch(input.startingBatch);
  const skippedBatches = getSkippedBatchNumbers(startingBatch);
  const ids = collectSkippableSentenceIds(
    dataset,
    progress,
    startingBatch,
    input.retake === true
  );

  let nextProgress = progress;
  let skippedSentenceCount = 0;

  if (ids.length > 0) {
    const bulk = bulkApplySentenceRatings(dataset, nextProgress, ids, 4);
    nextProgress = bulk.progress;
    skippedSentenceCount = bulk.retiredCount;
  }

  const placement: PlacementResult = {
    completedAt: new Date().toISOString(),
    level: input.level,
    levelMode: input.levelMode,
    startingBatch,
    skippedBatches,
    ...(input.probeAdjustments !== undefined
      ? { probeAdjustments: input.probeAdjustments }
      : {}),
  };

  nextProgress = {
    ...nextProgress,
    settings: {
      ...nextProgress.settings,
      placementCompleted: true,
      placement,
    },
  };

  return { progress: nextProgress, placement, skippedSentenceCount };
}

export function getPathwayBatchTitle(dataset: Dataset, batchNumber: number): string {
  const batch = dataset.main_pathway.batches.find((b) => b.batch_number === batchNumber);
  return batch?.batch_title ?? `Batch ${batchNumber}`;
}
