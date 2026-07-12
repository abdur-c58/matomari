import type { Dataset } from "@/types/sentence";
import type { UserProgress } from "@/types/progress";
import type { AppStats, DailySnapshot } from "@/types/stats";
import { formatDateKey } from "@/lib/utils";
import { getActiveBatchIds, getActiveBatchSentences } from "./batch-service";
import { getDueRecallIds, getDueReviewIds } from "./srs-service";

export type DailyStudyTaskId = "meanings" | "recall" | "review";

export type DailyStudyTask = {
  id: DailyStudyTaskId;
  label: string;
  done: boolean;
  remaining: number;
};

export type DailyStudyStatus = {
  date: string;
  hasBatch: boolean;
  tasks: DailyStudyTask[];
  isComplete: boolean;
  recordedComplete: boolean;
  completedAt: string | null;
  studiedToday: boolean;
  minutesToday: number;
  streak: number;
};

function dateKeyOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatDateKey(d);
}

export function getMinutesStudiedOnDate(stats: AppStats, date: string): number {
  return stats.modeSessions
    .filter((s) => s.startedAt.slice(0, 10) === date && s.endedAt)
    .reduce((sum, s) => sum + s.durationMs, 0);
}

export function getStudyStreak(snapshots: DailySnapshot[]): number {
  const completeDays = new Set(
    snapshots.filter((s) => s.studyComplete).map((s) => s.date)
  );
  if (completeDays.size === 0) return 0;

  let streak = 0;
  let offset = completeDays.has(formatDateKey()) ? 0 : -1;

  while (completeDays.has(dateKeyOffset(offset))) {
    streak++;
    offset--;
  }

  return streak;
}

export function getDailyStudyStatus(
  dataset: Dataset | null,
  progress: UserProgress,
  stats: AppStats
): DailyStudyStatus {
  const date = formatDateKey();
  const todaySnapshot = stats.dailySnapshots.find((s) => s.date === date);
  const studiedToday = stats.activeDays.includes(date);
  const minutesToday = Math.round(getMinutesStudiedOnDate(stats, date) / 60000);

  if (!dataset || !progress.batchConfig) {
    return {
      date,
      hasBatch: false,
      tasks: [],
      isComplete: false,
      recordedComplete: Boolean(todaySnapshot?.studyComplete),
      completedAt: todaySnapshot?.completedAt ?? null,
      studiedToday,
      minutesToday,
      streak: getStudyStreak(stats.dailySnapshots),
    };
  }

  const activeSentences = getActiveBatchSentences(dataset, progress);
  const activeIds = getActiveBatchIds(progress);
  const unconfirmed = activeSentences.filter(
    (s) => !progress.sentences[s.id]?.meaningConfirmed
  );
  const dueRecall = getDueRecallIds(progress.sentences, activeIds);
  const dueReview = getDueReviewIds(progress.sentences);

  const tasks: DailyStudyTask[] = [
    {
      id: "meanings",
      label: "Confirm meanings",
      done: unconfirmed.length === 0 && activeSentences.length > 0,
      remaining: unconfirmed.length,
    },
    {
      id: "recall",
      label: "Active recall due",
      done: dueRecall.length === 0,
      remaining: dueRecall.length,
    },
    {
      id: "review",
      label: "Review due",
      done: dueReview.length === 0,
      remaining: dueReview.length,
    },
  ];

  const isComplete =
    activeSentences.length > 0 &&
    tasks.every((t) => t.done);

  return {
    date,
    hasBatch: true,
    tasks,
    isComplete,
    recordedComplete: Boolean(todaySnapshot?.studyComplete),
    completedAt: todaySnapshot?.completedAt ?? null,
    studiedToday,
    minutesToday,
    streak: getStudyStreak(stats.dailySnapshots),
  };
}

export function mergeTodayStudyComplete(
  stats: AppStats,
  snapshot?: Partial<DailySnapshot>
): AppStats {
  const date = formatDateKey();
  const existing = stats.dailySnapshots.find((s) => s.date === date);
  const nextSnapshot: DailySnapshot = {
    date,
    weakCount: existing?.weakCount ?? snapshot?.weakCount ?? 0,
    masteredCount: existing?.masteredCount ?? snapshot?.masteredCount ?? 0,
    totalSentences: existing?.totalSentences ?? snapshot?.totalSentences ?? 0,
    studyComplete: true,
    completedAt: existing?.completedAt ?? new Date().toISOString(),
  };

  const dailySnapshots = [
    ...stats.dailySnapshots.filter((s) => s.date !== date),
    nextSnapshot,
  ].sort((a, b) => a.date.localeCompare(b.date));

  const activeDays = stats.activeDays.includes(date)
    ? stats.activeDays
    : [...stats.activeDays, date].sort();

  return { ...stats, dailySnapshots, activeDays };
}
