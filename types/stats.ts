export type StudyMode =
  | "listen"
  | "shadow"
  | "recall"
  | "review"
  | "meaning_check"
  | "library"
  | "weak";

export interface ModeSession {
  id: string;
  mode: StudyMode;
  startedAt: string;
  endedAt: string | null;
  durationMs: number;
}

export interface DailySnapshot {
  date: string;
  weakCount: number;
  masteredCount: number;
  totalSentences: number;
  studyComplete?: boolean;
  completedAt?: string;
  /**
   * Study task ids finished on this date. Once a task is completed for the day
   * it stays completed regardless of later batch changes, so the checklist
   * does not reset when the active batch is swapped on the same day.
   */
  completedTasks?: string[];
  /** Unique sentence ids heard via casual browse playlists today. */
  listenedSentenceIds?: string[];
}

export interface MasteryEvent {
  sentenceId: string;
  masteredAt: string;
  daysToMastery: number;
}

export interface AppStats {
  modeSessions: ModeSession[];
  dailySnapshots: DailySnapshot[];
  masteryEvents: MasteryEvent[];
  activeDays: string[];
}
