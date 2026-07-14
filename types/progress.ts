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
import type { NotificationPreferences } from "@/lib/constants/notifications";
import type { UiFont } from "@/lib/constants/ui-font";

export type PlacementLevel =
  | "brand_new"
  | "beginner"
  | "elementary"
  | "intermediate"
  | "upper_intermediate"
  | "advanced";

export interface PlacementResult {
  completedAt: string;
  level: PlacementLevel;
  levelMode: "fluency" | "jlpt";
  startingBatch: number;
  skippedBatches: number[];
  probeAdjustments?: number;
}

export interface AppSettings {
  batchSize: number;
  /** @deprecated Derived from showKansaiDialect + kansaiAsPrimary — kept for sync compat */
  dialect: Dialect;
  /** @deprecated Always true after migration — kept for sync compat */
  dialectChosen: boolean;
  /** When true, Kansai translations can be generated and viewed alongside Standard */
  showKansaiDialect: boolean;
  /** When true (and showKansaiDialect), Kansai is the default display dialect */
  kansaiAsPrimary: boolean;
  notifications: NotificationPreferences;
  /** Optional override for [name] placeholder resolution */
  displayName?: string;
  /** LLM-generated kana for TTS / Japanese [name] chips; keyed to japaneseNameSource */
  japaneseNameReading?: string;
  /** displayName (or session first name) used to produce japaneseNameReading */
  japaneseNameSource?: string;
  /** Product tour completed (synced across devices). */
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string;
  /** Pathway placement completed — used to skip batches for returning learners. */
  placementCompleted?: boolean;
  placement?: PlacementResult;
  /** UI typeface for Latin headings and body (Japanese uses separate fonts). */
  uiFont?: UiFont;
  /** Browse display on island/pathway detail pages. */
  islandBrowseDisplay?: "en" | "jp" | "both";
  /** Pause between sentences when playing casual playlists (ms). */
  casualPlaylistPauseMs?: number;
  /** Playback speed for casual island playlists. */
  casualPlaylistPlaybackRate?: number;
}

export interface IslandBatchSnapshot {
  activeSentenceIds: string[];
  switchedAwayAt: string;
  needsReturnReview?: boolean;
}

export interface IslandFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface UserProgress {
  /** Per-dialect study state; active dialect is also denormalized to top-level fields. */
  byDialect?: Partial<Record<Dialect, DialectStudyProgress>>;
  sentences: Record<string, SentenceProgress>;
  batchConfig: BatchConfig | null;
  settings: AppSettings;
  completedPathwayBatches: number[];
  completedIslands: string[];
  /** ISO timestamps when user last opened or studied a unit (keys: "pathway" | "island:<key>"). */
  studyUnitLastOpened?: Record<string, string>;
  /** Saved active batches when switching away from an island mid-study. */
  islandBatchSnapshots?: Record<string, IslandBatchSnapshot>;
  /** User-created folders for organizing islands on the Islands page. */
  islandFolders?: IslandFolder[];
  /** Island key → folder id; missing key means unfoldered. */
  islandFolderAssignments?: Record<string, string>;
}

export interface DialectStudyProgress {
  sentences: Record<string, SentenceProgress>;
  batchConfig: BatchConfig | null;
  completedPathwayBatches: number[];
  completedIslands: string[];
}
