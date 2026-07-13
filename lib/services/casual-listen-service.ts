import type { AppStats } from "@/types/stats";
import { formatDateKey } from "@/lib/utils";

export function getTodaySnapshot(stats: AppStats) {
  const today = formatDateKey();
  return stats.dailySnapshots.find((s) => s.date === today) ?? null;
}

export function getTodayCasualListenCount(stats: AppStats): number {
  return getTodaySnapshot(stats)?.listenedSentenceIds?.length ?? 0;
}

export function recordCasualListen(
  stats: AppStats,
  sentenceId: string
): AppStats {
  const today = formatDateKey();
  const existing = getTodaySnapshot(stats);
  const listened = existing?.listenedSentenceIds ?? [];

  if (listened.includes(sentenceId)) {
    return stats;
  }

  const nextIds = [...listened, sentenceId];
  const nextSnapshot = {
    date: today,
    weakCount: existing?.weakCount ?? 0,
    masteredCount: existing?.masteredCount ?? 0,
    totalSentences: existing?.totalSentences ?? 0,
    studyComplete: existing?.studyComplete,
    completedAt: existing?.completedAt,
    completedTasks: existing?.completedTasks,
    listenedSentenceIds: nextIds,
  };

  const filtered = stats.dailySnapshots.filter((s) => s.date !== today);
  return {
    ...stats,
    dailySnapshots: [...filtered, nextSnapshot].sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
  };
}
