import type { Dataset } from "@/types/sentence";
import type { SceneFolder, UserProgress } from "@/types/progress";
import type { PremadeCatalog } from "@/types/premade-catalog";
import {
  isPremadeFolderId,
  isPremadeSceneKey,
} from "@/lib/services/shared-premade-service";

const MAX_FOLDER_NAME_LENGTH = 64;

function normalizeFolderName(name: string): string {
  return name.trim().slice(0, MAX_FOLDER_NAME_LENGTH);
}

function userFolderIds(progress: UserProgress): Set<string> {
  return new Set((progress.sceneFolders ?? []).map((f) => f.id));
}

export function getUserFolders(progress: UserProgress): SceneFolder[] {
  return progress.sceneFolders ?? [];
}

export function createSceneFolder(
  progress: UserProgress,
  name: string
): UserProgress {
  const normalized = normalizeFolderName(name);
  if (!normalized) return progress;

  const folder: SceneFolder = {
    id: crypto.randomUUID(),
    name: normalized,
    createdAt: new Date().toISOString(),
  };

  return {
    ...progress,
    sceneFolders: [...(progress.sceneFolders ?? []), folder],
    sceneFolderAssignments: progress.sceneFolderAssignments ?? {},
  };
}

export function renameSceneFolder(
  progress: UserProgress,
  folderId: string,
  name: string
): UserProgress {
  const normalized = normalizeFolderName(name);
  if (!normalized) return progress;

  const folders = progress.sceneFolders ?? [];
  if (!folders.some((f) => f.id === folderId)) return progress;

  return {
    ...progress,
    sceneFolders: folders.map((f) =>
      f.id === folderId ? { ...f, name: normalized } : f
    ),
  };
}

export function deleteSceneFolder(
  progress: UserProgress,
  folderId: string
): UserProgress {
  const folders = progress.sceneFolders ?? [];
  if (!folders.some((f) => f.id === folderId)) return progress;

  const assignments = { ...(progress.sceneFolderAssignments ?? {}) };
  for (const [sceneKey, assignedFolderId] of Object.entries(assignments)) {
    if (assignedFolderId === folderId) {
      delete assignments[sceneKey];
    }
  }

  return {
    ...progress,
    sceneFolders: folders.filter((f) => f.id !== folderId),
    sceneFolderAssignments: assignments,
  };
}

export function assignSceneToFolder(
  progress: UserProgress,
  sceneKey: string,
  folderId: string | null,
  premadeCatalog: PremadeCatalog | null = null
): UserProgress {
  if (!sceneKey) return progress;
  if (isPremadeSceneKey(sceneKey, premadeCatalog)) return progress;
  if (folderId !== null && isPremadeFolderId(folderId, premadeCatalog)) {
    return progress;
  }

  const assignments = { ...(progress.sceneFolderAssignments ?? {}) };

  if (folderId === null) {
    delete assignments[sceneKey];
    return { ...progress, sceneFolderAssignments: assignments };
  }

  if (!userFolderIds(progress).has(folderId)) return progress;

  assignments[sceneKey] = folderId;
  return { ...progress, sceneFolderAssignments: assignments };
}

export function getSceneFolderId(
  progress: UserProgress,
  sceneKey: string
): string | null {
  return progress.sceneFolderAssignments?.[sceneKey] ?? null;
}

export function sanitizeSceneFolders(
  progress: UserProgress,
  dataset: Dataset,
  premadeCatalog: PremadeCatalog | null = null
): UserProgress {
  const validUserFolderIds = userFolderIds(progress);
  const userSceneKeys = new Set(
    Object.keys(dataset.scenes ?? {}).filter(
      (key) => !isPremadeSceneKey(key, premadeCatalog)
    )
  );
  const assignments = progress.sceneFolderAssignments ?? {};
  let changed = false;

  const nextAssignments: Record<string, string> = {};
  for (const [sceneKey, folderId] of Object.entries(assignments)) {
    if (
      isPremadeSceneKey(sceneKey, premadeCatalog) ||
      isPremadeFolderId(folderId, premadeCatalog) ||
      !userSceneKeys.has(sceneKey) ||
      !validUserFolderIds.has(folderId)
    ) {
      changed = true;
      continue;
    }
    nextAssignments[sceneKey] = folderId;
  }

  if (!changed) return progress;
  return { ...progress, sceneFolderAssignments: nextAssignments };
}

export function countScenesInFolder(grouped: {
  featured?: unknown[];
  inProgress: unknown[];
  untouched: unknown[];
  completed: unknown[];
}): number {
  return (
    (grouped.featured?.length ?? 0) +
    grouped.inProgress.length +
    grouped.untouched.length +
    grouped.completed.length
  );
}
