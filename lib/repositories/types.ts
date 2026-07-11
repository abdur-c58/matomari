import type { Dataset } from "@/types/sentence";
import type { SentenceProgress, UserProgress } from "@/types/progress";
import type { AppStats, DailySnapshot, StudyMode } from "@/types/stats";

export type SyncTable = "user_datasets" | "user_progress" | "user_stats";

export interface SyncQueueItem {
  id: string;
  table: SyncTable;
  payload: unknown;
  createdAt: string;
  retries: number;
}

export interface DatasetRepository {
  getDataset(): Promise<Dataset | null>;
  saveDataset(data: Dataset): Promise<void>;
  exportDataset(): Promise<Dataset | null>;
  hasDataset(): Promise<boolean>;
}

export interface ProgressRepository {
  getProgress(): Promise<UserProgress>;
  saveProgress(progress: UserProgress): Promise<void>;
  getSentenceProgress(sentenceId: string): Promise<SentenceProgress | null>;
  updateSentenceProgress(
    sentenceId: string,
    update: Partial<SentenceProgress> | ((prev: SentenceProgress) => SentenceProgress)
  ): Promise<UserProgress>;
  bulkUpdateProgress(
    updater: (progress: UserProgress) => UserProgress
  ): Promise<UserProgress>;
}

export interface StatsRepository {
  getStats(): Promise<AppStats>;
  saveStats(stats: AppStats): Promise<void>;
  recordActiveDay(): Promise<void>;
  startModeSession(mode: StudyMode): Promise<string>;
  endModeSession(sessionId: string): Promise<void>;
  recordDailySnapshot(snapshot: DailySnapshot): Promise<void>;
  recordMastery(sentenceId: string, daysToMastery: number): Promise<void>;
}

export interface SyncQueueRepository {
  enqueue(item: Omit<SyncQueueItem, "id" | "retries">): Promise<void>;
  getPending(): Promise<SyncQueueItem[]>;
  remove(id: string): Promise<void>;
  incrementRetry(id: string): Promise<void>;
}
