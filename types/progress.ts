export type BatchStatus = "active" | "retired" | "unseen";

export interface RecallAttempt {
  date: string;
  correct: boolean;
  hesitation?: boolean;
}

export interface SentenceProgress {
  sentenceId: string;
  rating: number | null;
  recallHistory: RecallAttempt[];
  meaningConfirmed: boolean;
  batchStatus: BatchStatus;
  srsNextReview: string | null;
  srsIntervalIndex: number;
  retiredAt: string | null;
  firstSeenAt: string | null;
  masteredAt: string | null;
  sourceType: "pathway" | "island";
  sourceKey: string;
}

export type BatchSourceType = "pathway" | "island";

export interface BatchConfig {
  sourceType: BatchSourceType;
  pathwayBatchNumber: number | null;
  islandKey: string | null;
  subtopic: string | null;
  batchSize: number;
  activeSentenceIds: string[];
}

import type { Dialect } from "@/lib/constants/dialect";
import { DEFAULT_DIALECT } from "@/lib/constants/dialect";

export interface AppSettings {
  batchSize: number;
  dialect: Dialect;
  /** False until the user explicitly picks a dialect in Preferences. */
  dialectChosen: boolean;
}

export interface UserProgress {
  sentences: Record<string, SentenceProgress>;
  batchConfig: BatchConfig | null;
  settings: AppSettings;
  completedPathwayBatches: number[];
}
