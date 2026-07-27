import type { Dataset, UserLibrary } from "@/types/sentence";
import type { SyncTable } from "@/lib/repositories/types";
import { getAllSentences } from "@/lib/validation/dataset-schema";

export type UploadProgressState = {
  active: boolean;
  label: string;
  subtitle?: string;
  completed: number;
  total: number;
  indeterminate?: boolean;
};

const idleState: UploadProgressState = {
  active: false,
  label: "",
  completed: 0,
  total: 0,
};

let uploadState: UploadProgressState = idleState;
const listeners = new Set<(state: UploadProgressState) => void>();

export function getUploadProgress(): UploadProgressState {
  return uploadState;
}

export function onUploadProgressChange(
  listener: (state: UploadProgressState) => void
): () => void {
  listeners.add(listener);
  listener(uploadState);
  return () => listeners.delete(listener);
}

function emit(state: UploadProgressState) {
  uploadState = state;
  listeners.forEach((l) => l(state));
}

export function setUploadProgress(update: Partial<UploadProgressState> & { active: true }): void {
  emit({ ...uploadState, ...update, active: true });
}

export function clearUploadProgress(): void {
  emit(idleState);
}

export function describeDatasetPayload(payload: unknown): {
  sentenceCount: number;
  sceneCount: number;
} {
  if (!payload || typeof payload !== "object") {
    return { sentenceCount: 0, sceneCount: 0 };
  }

  const data = payload as Dataset | UserLibrary;
  const scenes = data.scenes ?? {};

  if (!("main_pathway" in data) && Object.keys(scenes).length === 0) {
    return { sentenceCount: 0, sceneCount: 0 };
  }

  try {
    if ("main_pathway" in data) {
      return {
        sentenceCount: getAllSentences(data as Dataset).size,
        sceneCount: Object.keys(scenes).length,
      };
    }

    const sceneSentences = Object.values(scenes).reduce(
      (n, scene) => n + scene.sentences.length,
      0
    );
    return {
      sentenceCount: sceneSentences,
      sceneCount: Object.keys(scenes).length,
    };
  } catch {
    return { sentenceCount: 0, sceneCount: 0 };
  }
}

function formatCounts(sentenceCount: number, sceneCount: number): string {
  const parts: string[] = [];
  if (sentenceCount > 0) {
    parts.push(`${sentenceCount} sentence${sentenceCount === 1 ? "" : "s"}`);
  }
  if (sceneCount > 0) {
    parts.push(`${sceneCount} scene${sceneCount === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
}

export function labelForSyncTable(table: SyncTable, payload: unknown): string {
  if (table === "user_datasets") {
    const { sentenceCount, sceneCount } = describeDatasetPayload(payload);
    const counts = formatCounts(sentenceCount, sceneCount);
    return counts ? `Uploading ${counts}` : "Uploading library";
  }
  if (table === "user_progress") return "Uploading study progress";
  return "Uploading stats";
}

export function subtitleForSyncTable(table: SyncTable, payload: unknown): string | undefined {
  if (table !== "user_datasets") return "Saving to cloud";
  const { sentenceCount, sceneCount } = describeDatasetPayload(payload);
  if (sentenceCount === 0 && sceneCount === 0) return "Saving to cloud";
  return "Saving library to cloud";
}

export function reportTranslationProgress(completed: number, total: number): void {
  setUploadProgress({
    active: true,
    label: "Translating sentences",
    subtitle:
      total > 0
        ? `${total} sentence${total === 1 ? "" : "s"} before upload`
        : "Preparing library for upload",
    completed,
    total,
    indeterminate: false,
  });
}
