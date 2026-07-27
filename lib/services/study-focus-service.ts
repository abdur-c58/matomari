import type { Dataset } from "@/types/sentence";
import type { UserProgress } from "@/types/progress";
import { getPlacementStartingBatch } from "./placement-service";
import { getActiveBatchSentences } from "./batch-service";

export interface StudyFocus {
  sourceType: "pathway" | "scene";
  label: string;
  shortLabel: string;
  detail: string;
  detailHref: string;
}

export interface PathwayBatchStat {
  batchNumber: number;
  title: string;
  difficultyRange: [number, number];
  total: number;
  studied: number;
  complete: boolean;
  percentComplete: number;
}

export interface SceneSummary {
  key: string;
  title: string;
  description: string;
  sentenceCount: number;
  studiedCount: number;
  complete: boolean;
  subtopics: string[];
}

export interface StudyFocusProgress {
  activeCount: number;
  confirmedCount: number;
}

function formatLabel(key: string): string {
  return key.replace(/_/g, " ");
}

function isSentenceStudied(
  sentenceId: string,
  progress: UserProgress
): boolean {
  const sp = progress.sentences[sentenceId];
  if (!sp) return false;
  return sp.batchStatus !== "unseen" || sp.rating !== null;
}

function isSentenceComplete(
  sentenceId: string,
  progress: UserProgress
): boolean {
  const sp = progress.sentences[sentenceId];
  if (!sp) return false;
  return sp.batchStatus === "retired" || (sp.rating !== null && sp.rating >= 4);
}

export function isSceneComplete(
  dataset: Dataset,
  progress: UserProgress,
  sceneKey: string
): boolean {
  const scene = dataset.scenes[sceneKey];
  if (!scene || scene.sentences.length === 0) return false;
  return scene.sentences.every((s) => isSentenceComplete(s.id, progress));
}

export function isPathwayBatchComplete(
  dataset: Dataset,
  progress: UserProgress,
  batchNumber: number
): boolean {
  const batch = dataset.main_pathway.batches.find((b) => b.batch_number === batchNumber);
  if (!batch || batch.sentences.length === 0) return false;
  return batch.sentences.every((s) => isSentenceComplete(s.id, progress));
}

export function getPathwayBatchStats(
  dataset: Dataset,
  progress: UserProgress
): PathwayBatchStat[] {
  return dataset.main_pathway.batches.map((batch) => {
    const total = batch.sentences.length;
    const studied = batch.sentences.filter((s) => isSentenceStudied(s.id, progress)).length;
    const complete =
      progress.completedPathwayBatches.includes(batch.batch_number) ||
      isPathwayBatchComplete(dataset, progress, batch.batch_number);
    const completedCount = batch.sentences.filter((s) =>
      isSentenceComplete(s.id, progress)
    ).length;

    return {
      batchNumber: batch.batch_number,
      title: batch.batch_title,
      difficultyRange: batch.target_difficulty_range,
      total,
      studied,
      complete,
      percentComplete: total > 0 ? Math.round((completedCount / total) * 100) : 0,
    };
  });
}

export function getSuggestedPathwayBatch(
  dataset: Dataset,
  progress: UserProgress
): number {
  const stats = getPathwayBatchStats(dataset, progress);
  const placementStart = getPlacementStartingBatch(progress);

  const firstIncomplete = stats.find((b) => !b.complete);
  if (firstIncomplete) {
    const batchNum = firstIncomplete.batchNumber;
    if (placementStart != null) {
      return Math.max(placementStart, batchNum);
    }
    return batchNum;
  }

  const firstUnstudied = stats.find((b) => b.studied < b.total);
  if (firstUnstudied) {
    const batchNum = firstUnstudied.batchNumber;
    if (placementStart != null) {
      return Math.max(placementStart, batchNum);
    }
    return batchNum;
  }

  if (placementStart != null) return placementStart;
  return stats[0]?.batchNumber ?? 1;
}

export function getSceneSummaries(
  dataset: Dataset,
  progress: UserProgress
): SceneSummary[] {
  return Object.entries(dataset.scenes).map(([key, scene]) => ({
    key,
    title: scene.title?.trim() || formatLabel(key.replace(/^premade_/, "")),
    description: scene.description,
    sentenceCount: scene.sentences.length,
    studiedCount: scene.sentences.filter((s) => isSentenceStudied(s.id, progress)).length,
    complete:
      progress.completedScenes.includes(key) ||
      isSceneComplete(dataset, progress, key),
    subtopics: scene.subtopics,
  }));
}

export function getStudyFocusLabel(
  dataset: Dataset,
  progress: UserProgress
): StudyFocus | null {
  const config = progress.batchConfig;
  if (!config) return null;

  if (config.sourceType === "pathway" && config.pathwayBatchNumber !== null) {
    const batch = dataset.main_pathway.batches.find(
      (b) => b.batch_number === config.pathwayBatchNumber
    );
    const title = batch?.batch_title ?? `Batch ${config.pathwayBatchNumber}`;
    return {
      sourceType: "pathway",
      label: `Pathway · Batch ${config.pathwayBatchNumber} — ${title}`,
      shortLabel: "Main pathway",
      detail: title,
      detailHref: "/batch",
    };
  }

  if (config.sourceType === "scene" && config.sceneKey) {
    const scene = dataset.scenes[config.sceneKey];
    const title =
      scene?.title?.trim() ||
      formatLabel(config.sceneKey.replace(/^premade_/, ""));
    const subtopic =
      config.subtopic ? ` · ${formatLabel(config.subtopic)}` : "";
    return {
      sourceType: "scene",
      label: `Scene · ${title}${subtopic}`,
      shortLabel: "Topic scene",
      detail: title,
      detailHref: `/batch/scene/${encodeURIComponent(config.sceneKey)}`,
    };
  }

  return null;
}

export function getStudyFocusProgress(
  dataset: Dataset,
  progress: UserProgress
): StudyFocusProgress {
  const active = getActiveBatchSentences(dataset, progress);
  const confirmed = active.filter((s) => progress.sentences[s.id]?.meaningConfirmed).length;
  return { activeCount: active.length, confirmedCount: confirmed };
}

export interface PathwayBatchProgressDetail {
  confirmed: number;
  active: number;
  touched: number;
  total: number;
  isActiveBatch: boolean;
}

export function getActiveBatchProgressForPathwayBatch(
  dataset: Dataset,
  progress: UserProgress,
  batchNumber: number
): PathwayBatchProgressDetail {
  const batch = dataset.main_pathway.batches.find(
    (b) => b.batch_number === batchNumber
  );
  const total = batch?.sentences.length ?? 0;
  const touched =
    batch?.sentences.filter((s) => isSentenceStudied(s.id, progress)).length ?? 0;

  const config = progress.batchConfig;
  const isActiveBatch =
    config?.sourceType === "pathway" &&
    config.pathwayBatchNumber === batchNumber;

  if (isActiveBatch) {
    const focus = getStudyFocusProgress(dataset, progress);
    return {
      confirmed: focus.confirmedCount,
      active: focus.activeCount,
      touched,
      total,
      isActiveBatch: true,
    };
  }

  return {
    confirmed: 0,
    active: 0,
    touched,
    total,
    isActiveBatch: false,
  };
}

export function maybeMarkPathwayBatchComplete(
  dataset: Dataset,
  progress: UserProgress,
  batchNumber: number
): UserProgress {
  if (progress.completedPathwayBatches.includes(batchNumber)) return progress;
  if (!isPathwayBatchComplete(dataset, progress, batchNumber)) return progress;

  return {
    ...progress,
    completedPathwayBatches: [...progress.completedPathwayBatches, batchNumber].sort(
      (a, b) => a - b
    ),
  };
}

export function maybeMarkSceneComplete(
  dataset: Dataset,
  progress: UserProgress,
  sceneKey: string
): UserProgress {
  if (progress.completedScenes.includes(sceneKey)) return progress;
  if (!isSceneComplete(dataset, progress, sceneKey)) return progress;

  return {
    ...progress,
    completedScenes: [...progress.completedScenes, sceneKey].sort(),
  };
}

export function markPathwayBatchCompleteAfterRetire(
  dataset: Dataset,
  progress: UserProgress,
  sentenceId: string
): UserProgress {
  const sp = progress.sentences[sentenceId];
  if (!sp || sp.sourceType !== "pathway") return progress;

  const batchNumber = Number(sp.sourceKey);
  if (Number.isNaN(batchNumber)) return progress;

  return maybeMarkPathwayBatchComplete(dataset, progress, batchNumber);
}
