import type { Dataset } from "@/types/sentence";
import type { IslandFolder, UserProgress } from "@/types/progress";
import type { PremadeCatalog } from "@/types/premade-catalog";
import {
  isPremadeFolderId,
  isPremadeIslandKey,
} from "@/lib/services/shared-premade-service";

const MAX_FOLDER_NAME_LENGTH = 64;

function normalizeFolderName(name: string): string {
  return name.trim().slice(0, MAX_FOLDER_NAME_LENGTH);
}

function userFolderIds(progress: UserProgress): Set<string> {
  return new Set((progress.islandFolders ?? []).map((f) => f.id));
}

export function getUserFolders(progress: UserProgress): IslandFolder[] {
  return progress.islandFolders ?? [];
}

export function createIslandFolder(
  progress: UserProgress,
  name: string
): UserProgress {
  const normalized = normalizeFolderName(name);
  if (!normalized) return progress;

  const folder: IslandFolder = {
    id: crypto.randomUUID(),
    name: normalized,
    createdAt: new Date().toISOString(),
  };

  return {
    ...progress,
    islandFolders: [...(progress.islandFolders ?? []), folder],
    islandFolderAssignments: progress.islandFolderAssignments ?? {},
  };
}

export function renameIslandFolder(
  progress: UserProgress,
  folderId: string,
  name: string
): UserProgress {
  const normalized = normalizeFolderName(name);
  if (!normalized) return progress;

  const folders = progress.islandFolders ?? [];
  if (!folders.some((f) => f.id === folderId)) return progress;

  return {
    ...progress,
    islandFolders: folders.map((f) =>
      f.id === folderId ? { ...f, name: normalized } : f
    ),
  };
}

export function deleteIslandFolder(
  progress: UserProgress,
  folderId: string
): UserProgress {
  const folders = progress.islandFolders ?? [];
  if (!folders.some((f) => f.id === folderId)) return progress;

  const assignments = { ...(progress.islandFolderAssignments ?? {}) };
  for (const [islandKey, assignedFolderId] of Object.entries(assignments)) {
    if (assignedFolderId === folderId) {
      delete assignments[islandKey];
    }
  }

  return {
    ...progress,
    islandFolders: folders.filter((f) => f.id !== folderId),
    islandFolderAssignments: assignments,
  };
}

export function assignIslandToFolder(
  progress: UserProgress,
  islandKey: string,
  folderId: string | null,
  premadeCatalog: PremadeCatalog | null = null
): UserProgress {
  if (!islandKey) return progress;
  if (isPremadeIslandKey(islandKey, premadeCatalog)) return progress;
  if (folderId !== null && isPremadeFolderId(folderId, premadeCatalog)) {
    return progress;
  }

  const assignments = { ...(progress.islandFolderAssignments ?? {}) };

  if (folderId === null) {
    delete assignments[islandKey];
    return { ...progress, islandFolderAssignments: assignments };
  }

  if (!userFolderIds(progress).has(folderId)) return progress;

  assignments[islandKey] = folderId;
  return { ...progress, islandFolderAssignments: assignments };
}

export function getIslandFolderId(
  progress: UserProgress,
  islandKey: string
): string | null {
  return progress.islandFolderAssignments?.[islandKey] ?? null;
}

export function sanitizeIslandFolders(
  progress: UserProgress,
  dataset: Dataset,
  premadeCatalog: PremadeCatalog | null = null
): UserProgress {
  const validUserFolderIds = userFolderIds(progress);
  const userIslandKeys = new Set(
    Object.keys(dataset.islands ?? {}).filter(
      (key) => !isPremadeIslandKey(key, premadeCatalog)
    )
  );
  const assignments = progress.islandFolderAssignments ?? {};
  let changed = false;

  const nextAssignments: Record<string, string> = {};
  for (const [islandKey, folderId] of Object.entries(assignments)) {
    if (
      isPremadeIslandKey(islandKey, premadeCatalog) ||
      isPremadeFolderId(folderId, premadeCatalog) ||
      !userIslandKeys.has(islandKey) ||
      !validUserFolderIds.has(folderId)
    ) {
      changed = true;
      continue;
    }
    nextAssignments[islandKey] = folderId;
  }

  if (!changed) return progress;
  return { ...progress, islandFolderAssignments: nextAssignments };
}

export function countIslandsInFolder(grouped: {
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
