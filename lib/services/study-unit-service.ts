import type { Dataset } from "@/types/sentence";
import type { SceneFolder, UserProgress } from "@/types/progress";
import type { PremadeCatalog, PremadeFolder } from "@/types/premade-catalog";
import {
  getSceneSummaries,
  getPathwayBatchStats,
  isSceneComplete,
  isPathwayBatchComplete,
} from "@/lib/services/study-focus-service";
import { sanitizeSceneFolders } from "@/lib/services/scene-folder-service";
import { isPremadeSceneKey } from "@/lib/services/shared-premade-service";
import { PATHWAY_THEME_KANJI } from "@/lib/services/study-unit-kanji-service";
import { formatCreatedBy } from "@/lib/services/scene-identity-service";
import { combineParalinguisticTags } from "@/lib/audio/fish-audio-cues";

export type StudyUnitRef =
  | { kind: "pathway" }
  | { kind: "scene"; key: string };

export type StudyUnitStatus = "in_progress" | "untouched" | "completed";

export type StudyUnitStatusFilter = "all" | StudyUnitStatus;

export type SceneOriginFilter = "all" | "premade" | "user";

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
  isPremade: boolean;
  isFeatured: boolean;
  /** Multi-speaker dialogue scene (e.g. Q&A). */
  isNarration: boolean;
  /** Live membership / shared read-only scene. */
  isShared: boolean;
  createdByLabel: string | null;
  themeKanji: string;
}

export function studyUnitKey(ref: StudyUnitRef): string {
  return ref.kind === "pathway" ? "pathway" : `scene:${ref.key}`;
}

export function parseStudyUnitKey(key: string): StudyUnitRef | null {
  if (key === "pathway") return { kind: "pathway" };
  if (key.startsWith("scene:")) {
    const sceneKey = key.slice("scene:".length);
    return sceneKey ? { kind: "scene", key: sceneKey } : null;
  }
  return null;
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
  progress: UserProgress,
  premadeCatalog: PremadeCatalog | null = null
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
    isPremade: false,
    isFeatured: false,
    isNarration: false,
    isShared: false,
    createdByLabel: null,
    themeKanji: PATHWAY_THEME_KANJI,
  };

  const scenes = getSceneSummaries(dataset, progress).map((scene) => {
    const ref: StudyUnitRef = { kind: "scene", key: scene.key };
    const data = dataset.scenes[scene.key];
    return {
      ref,
      title: scene.title,
      description: scene.description,
      sentenceCount: scene.sentenceCount,
      studiedCount: scene.studiedCount,
      complete:
        scene.complete ||
        isSceneComplete(dataset, progress, scene.key),
      status: deriveStatus(
        scene.complete || isSceneComplete(dataset, progress, scene.key),
        scene.studiedCount
      ),
      lastStudiedAt: deriveLastStudiedAt(progress, ref, scene.studiedCount),
      isPathway: false,
      isPremade: isPremadeSceneKey(scene.key, premadeCatalog),
      isFeatured: Boolean(data?.featured),
      isNarration: data?.format === "narration",
      isShared: Boolean(data?.readOnly || data?.provenance?.kind === "shared"),
      createdByLabel: formatCreatedBy(data?.createdBy),
      themeKanji: data?.themeKanji ?? "島",
    } satisfies StudyUnitSummary;
  });

  // Pathway kept for silent compose/legacy progress; Scenes UI filters it out.
  return [pathwayUnit, ...scenes];
}

export function getSceneStudyUnits(
  dataset: Dataset,
  progress: UserProgress,
  premadeCatalog: PremadeCatalog | null = null
): StudyUnitSummary[] {
  return getStudyUnits(dataset, progress, premadeCatalog).filter((u) => !u.isPathway);
}

export function filterStudyUnitsByOrigin(
  units: StudyUnitSummary[],
  originFilter: SceneOriginFilter
): StudyUnitSummary[] {
  if (originFilter === "all") return units;
  return units.filter((unit) => {
    if (unit.isPathway) return originFilter === "user";
    if (originFilter === "premade") return unit.isPremade;
    return !unit.isPremade;
  });
}

export function getCanonicalStudyUnitOrder(units: StudyUnitSummary[]): StudyUnitSummary[] {
  const [pathway, ...scenes] = units;
  const sortedScenes = [...scenes].sort((a, b) => {
    const aTime = a.lastStudiedAt ? new Date(a.lastStudiedAt).getTime() : 0;
    const bTime = b.lastStudiedAt ? new Date(b.lastStudiedAt).getTime() : 0;
    if (bTime !== aTime) return bTime - aTime;
    return a.title.localeCompare(b.title);
  });
  return pathway ? [pathway, ...sortedScenes] : sortedScenes;
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
  /** Featured essentials (e.g. 300 scenes) — always rendered first. */
  featured: StudyUnitSummary[];
  inProgress: StudyUnitSummary[];
  untouched: StudyUnitSummary[];
  completed: StudyUnitSummary[];
}

function compareFeaturedTitle(a: StudyUnitSummary, b: StudyUnitSummary): number {
  return a.title.localeCompare(b.title);
}

export function groupStudyUnits(units: StudyUnitSummary[]): GroupedStudyUnits {
  const featured = units
    .filter((u) => u.isFeatured)
    .sort(compareFeaturedTitle);

  const rest = units.filter((u) => !u.isFeatured);

  const inProgress = rest
    .filter((u) => u.status === "in_progress")
    .sort((a, b) => {
      const aTime = a.lastStudiedAt ? new Date(a.lastStudiedAt).getTime() : 0;
      const bTime = b.lastStudiedAt ? new Date(b.lastStudiedAt).getTime() : 0;
      return bTime - aTime;
    });

  const untouched = rest
    .filter((u) => u.status === "untouched")
    .sort((a, b) => a.title.localeCompare(b.title));

  const completed = rest
    .filter((u) => u.status === "completed")
    .sort((a, b) => a.title.localeCompare(b.title));

  return { featured, inProgress, untouched, completed };
}

export interface FolderedStudyUnits {
  pinnedPathway: StudyUnitSummary | null;
  premadeFolders: {
    folder: PremadeFolder;
    grouped: GroupedStudyUnits;
    sceneCount: number;
  }[];
  premadeUnfoldered: GroupedStudyUnits;
  userFolders: { folder: SceneFolder; grouped: GroupedStudyUnits }[];
  unfoldered: GroupedStudyUnits;
}

function groupedHasUnits(grouped: GroupedStudyUnits): boolean {
  return (
    grouped.featured.length > 0 ||
    grouped.inProgress.length > 0 ||
    grouped.untouched.length > 0 ||
    grouped.completed.length > 0
  );
}

function bucketPremadeScenes(
  scenes: StudyUnitSummary[],
  premadeFolders: PremadeFolder[],
  premadeAssignments: Record<string, string>
): {
  byFolderId: Map<string, StudyUnitSummary[]>;
  unfoldered: StudyUnitSummary[];
} {
  const byFolderId = new Map<string, StudyUnitSummary[]>();
  const unfoldered: StudyUnitSummary[] = [];

  for (const scene of scenes) {
    if (scene.ref.kind !== "scene" || !scene.isPremade) continue;

    const folderId = premadeAssignments[scene.ref.key];
    if (folderId && premadeFolders.some((f) => f.id === folderId)) {
      const bucket = byFolderId.get(folderId) ?? [];
      bucket.push(scene);
      byFolderId.set(folderId, bucket);
    } else {
      unfoldered.push(scene);
    }
  }

  return { byFolderId, unfoldered };
}

export function organizeStudyUnitsForDisplay(
  units: StudyUnitSummary[],
  progress: UserProgress,
  dataset: Dataset,
  premadeCatalog: PremadeCatalog | null = null,
  allUnits: StudyUnitSummary[] = units
): FolderedStudyUnits {
  const sanitized = sanitizeSceneFolders(progress, dataset, premadeCatalog);
  const userAssignments = sanitized.sceneFolderAssignments ?? {};
  const userFolders = sanitized.sceneFolders ?? [];
  const premadeAssignments = premadeCatalog?.sceneFolderAssignments ?? {};
  const premadeFolders = [...(premadeCatalog?.folders ?? [])].sort(
    (a, b) => a.order - b.order
  );

  const scenes = units.filter((u) => !u.isPathway);
  const allScenes = allUnits.filter((u) => !u.isPathway);

  const premadeAll = bucketPremadeScenes(
    allScenes,
    premadeFolders,
    premadeAssignments
  );
  const premadeFiltered = bucketPremadeScenes(
    scenes,
    premadeFolders,
    premadeAssignments
  );
  const userByFolderId = new Map<string, StudyUnitSummary[]>();
  const userUnfolderedScenes: StudyUnitSummary[] = [];

  for (const scene of scenes) {
    if (scene.ref.kind !== "scene" || scene.isPremade) continue;

    const folderId = userAssignments[scene.ref.key];
    if (folderId && userFolders.some((f) => f.id === folderId)) {
      const bucket = userByFolderId.get(folderId) ?? [];
      bucket.push(scene);
      userByFolderId.set(folderId, bucket);
    } else {
      userUnfolderedScenes.push(scene);
    }
  }

  const premadeFolderSections = premadeFolders.map((folder) => ({
    folder,
    grouped: groupStudyUnits(premadeFiltered.byFolderId.get(folder.id) ?? []),
    sceneCount: (premadeAll.byFolderId.get(folder.id) ?? []).length,
  }));

  const userFolderSections = userFolders
    .map((folder) => ({
      folder,
      grouped: groupStudyUnits(userByFolderId.get(folder.id) ?? []),
    }))
    .filter(({ grouped }) => groupedHasUnits(grouped));

  return {
    pinnedPathway: null,
    premadeFolders: premadeFolderSections,
    premadeUnfoldered: groupStudyUnits(premadeFiltered.unfoldered),
    userFolders: userFolderSections,
    unfoldered: groupStudyUnits(userUnfolderedScenes),
  };
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

  const scene = dataset.scenes[ref.key];
  if (!scene) return [];
  if (scene.format !== "narration" || !scene.narrationMode?.toneTags.length) {
    return scene.sentences;
  }

  return scene.sentences.map((sentence) => ({
    ...sentence,
    paralinguisticTags: combineParalinguisticTags(
      scene.narrationMode?.toneTags,
      sentence.paralinguisticTags
    ),
  }));
}
