import type { Dataset } from "@/types/sentence";
import type { UserProgress } from "@/types/progress";
import {
  getIslandSummaries,
  getPathwayBatchStats,
  isIslandComplete,
  isPathwayBatchComplete,
} from "@/lib/services/study-focus-service";
import { PATHWAY_THEME_KANJI } from "@/lib/services/study-unit-kanji-service";

export type StudyUnitRef =
  | { kind: "pathway" }
  | { kind: "island"; key: string };

export type StudyUnitStatus = "in_progress" | "untouched" | "completed";

export type StudyUnitStatusFilter = "all" | StudyUnitStatus;

export interface StudyUnitSummary {
  ref: StudyUnitRef;
  title: string;
  description: string;
  sentenceCount: number;
  studiedCount: number;
  complete: boolean;
  status: StudyUnitStatus;
  lastStudiedAt: string | null;
  isPathway: boolean;
  themeKanji: string;
}

export function studyUnitKey(ref: StudyUnitRef): string {
  return ref.kind === "pathway" ? "pathway" : `island:${ref.key}`;
}

export function parseStudyUnitKey(key: string): StudyUnitRef | null {
  if (key === "pathway") return { kind: "pathway" };
  if (key.startsWith("island:")) {
    const islandKey = key.slice("island:".length);
    return islandKey ? { kind: "island", key: islandKey } : null;
  }
  return null;
}

function isSentenceStudied(sentenceId: string, progress: UserProgress): boolean {
  const sp = progress.sentences[sentenceId];
  if (!sp) return false;
  return sp.batchStatus !== "unseen" || sp.rating !== null;
}

function deriveLastStudiedAt(
  progress: UserProgress,
  ref: StudyUnitRef,
  studiedCount: number
): string | null {
  const stored = progress.studyUnitLastOpened?.[studyUnitKey(ref)];
  if (stored) return stored;
  if (studiedCount === 0) return null;
  return null;
}

function deriveStatus(complete: boolean, studiedCount: number): StudyUnitStatus {
  if (complete) return "completed";
  if (studiedCount > 0) return "in_progress";
  return "untouched";
}

export function getStudyUnits(
  dataset: Dataset,
  progress: UserProgress
): StudyUnitSummary[] {
  const pathwayStats = getPathwayBatchStats(dataset, progress);
  const pathwaySentenceCount = pathwayStats.reduce((n, b) => n + b.total, 0);
  const pathwayStudied = pathwayStats.reduce((n, b) => n + b.studied, 0);
  const pathwayComplete =
    pathwayStats.length > 0 &&
    pathwayStats.every(
      (b) =>
        progress.completedPathwayBatches.includes(b.batchNumber) ||
        isPathwayBatchComplete(dataset, progress, b.batchNumber)
    );

  const pathwayRef: StudyUnitRef = { kind: "pathway" };
  const pathwayUnit: StudyUnitSummary = {
    ref: pathwayRef,
    title: "Main Pathway",
    description: dataset.main_pathway.description,
    sentenceCount: pathwaySentenceCount,
    studiedCount: pathwayStudied,
    complete: pathwayComplete,
    status: deriveStatus(pathwayComplete, pathwayStudied),
    lastStudiedAt: deriveLastStudiedAt(progress, pathwayRef, pathwayStudied),
    isPathway: true,
    themeKanji: PATHWAY_THEME_KANJI,
  };

  const islands = getIslandSummaries(dataset, progress).map((island) => {
    const ref: StudyUnitRef = { kind: "island", key: island.key };
    return {
      ref,
      title: island.title,
      description: island.description,
      sentenceCount: island.sentenceCount,
      studiedCount: island.studiedCount,
      complete:
        island.complete ||
        isIslandComplete(dataset, progress, island.key),
      status: deriveStatus(
        island.complete || isIslandComplete(dataset, progress, island.key),
        island.studiedCount
      ),
      lastStudiedAt: deriveLastStudiedAt(progress, ref, island.studiedCount),
      isPathway: false,
      themeKanji: dataset.islands[island.key]?.themeKanji ?? "島",
    } satisfies StudyUnitSummary;
  });

  return [pathwayUnit, ...islands];
}

export function getCanonicalStudyUnitOrder(units: StudyUnitSummary[]): StudyUnitSummary[] {
  const [pathway, ...islands] = units;
  const sortedIslands = [...islands].sort((a, b) => {
    const aTime = a.lastStudiedAt ? new Date(a.lastStudiedAt).getTime() : 0;
    const bTime = b.lastStudiedAt ? new Date(b.lastStudiedAt).getTime() : 0;
    if (bTime !== aTime) return bTime - aTime;
    return a.title.localeCompare(b.title);
  });
  return pathway ? [pathway, ...sortedIslands] : sortedIslands;
}

export function filterStudyUnits(
  units: StudyUnitSummary[],
  query: string,
  statusFilter: StudyUnitStatusFilter
): StudyUnitSummary[] {
  const q = query.trim().toLowerCase();
  return units.filter((unit) => {
    if (statusFilter !== "all" && unit.status !== statusFilter) return false;
    if (!q) return true;
    return (
      unit.title.toLowerCase().includes(q) ||
      unit.description.toLowerCase().includes(q)
    );
  });
}

export interface GroupedStudyUnits {
  inProgress: StudyUnitSummary[];
  untouched: StudyUnitSummary[];
  completed: StudyUnitSummary[];
}

export function groupStudyUnits(units: StudyUnitSummary[]): GroupedStudyUnits {
  const inProgress = units
    .filter((u) => u.status === "in_progress")
    .sort((a, b) => {
      const aTime = a.lastStudiedAt ? new Date(a.lastStudiedAt).getTime() : 0;
      const bTime = b.lastStudiedAt ? new Date(b.lastStudiedAt).getTime() : 0;
      return bTime - aTime;
    });

  const untouched = units
    .filter((u) => u.status === "untouched")
    .sort((a, b) => a.title.localeCompare(b.title));

  const completed = units
    .filter((u) => u.status === "completed")
    .sort((a, b) => a.title.localeCompare(b.title));

  return { inProgress, untouched, completed };
}

export function touchStudyUnit(
  progress: UserProgress,
  ref: StudyUnitRef,
  at: string = new Date().toISOString()
): UserProgress {
  const key = studyUnitKey(ref);
  return {
    ...progress,
    studyUnitLastOpened: {
      ...progress.studyUnitLastOpened,
      [key]: at,
    },
  };
}

export function getSentencesForStudyUnit(
  dataset: Dataset,
  ref: StudyUnitRef,
  pathwayBatchNumber?: number | null
) {
  if (ref.kind === "pathway") {
    if (pathwayBatchNumber != null) {
      const batch = dataset.main_pathway.batches.find(
        (b) => b.batch_number === pathwayBatchNumber
      );
      return batch?.sentences ?? [];
    }
    return dataset.main_pathway.batches.flatMap((b) => b.sentences);
  }

  return dataset.islands[ref.key]?.sentences ?? [];
}
