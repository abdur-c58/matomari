"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/components/providers/app-provider";
import {
  getDailyStudyStatus,
  mergeTodayStudyComplete,
  mergeTodayTaskCompletion,
} from "@/lib/services/daily-progress-service";
import { saveStatsSynced } from "@/lib/sync/sync-service";
import type { DailyStudyTaskId } from "@/lib/services/daily-progress-service";

/**
 * Persist today's progress as it happens:
 * - Each finished task is recorded for the day so a batch change never unchecks it.
 * - The overall completion flag is recorded when the whole queue is cleared.
 */
export function useSyncTodayCompletion() {
  const { dataset, progress, stats, setStats } = useApp();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (syncingRef.current) return;
    const status = getDailyStudyStatus(dataset, progress, stats);

    const doneTaskIds = status.tasks
      .filter((t) => t.done)
      .map((t) => t.id as DailyStudyTaskId);

    const withTasks = mergeTodayTaskCompletion(stats, doneTaskIds);
    const tasksChanged = withTasks !== stats;
    const needsCompletion = status.isComplete && !status.recordedComplete;

    if (!tasksChanged && !needsCompletion) return;

    syncingRef.current = true;
    void (async () => {
      try {
        const next = needsCompletion
          ? mergeTodayStudyComplete(withTasks)
          : withTasks;
        await saveStatsSynced(next);
        await setStats(next);
      } finally {
        syncingRef.current = false;
      }
    })();
  }, [dataset, progress, stats, setStats]);
}
