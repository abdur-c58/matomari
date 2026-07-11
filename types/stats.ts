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
