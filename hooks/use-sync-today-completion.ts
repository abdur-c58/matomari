"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/components/providers/app-provider";
import {
  getDailyStudyStatus,
  mergeTodayStudyComplete,
} from "@/lib/services/daily-progress-service";
import { saveStatsSynced } from "@/lib/sync/sync-service";

/** Persist today's completion when the study queue is cleared. */
export function useSyncTodayCompletion() {
  const { dataset, progress, stats, setStats } = useApp();
  const syncingRef = useRef(false);

  useEffect(() => {
    const status = getDailyStudyStatus(dataset, progress, stats);
    if (!status.isComplete || status.recordedComplete || syncingRef.current) return;

    syncingRef.current = true;
    void (async () => {
      try {
        const next = mergeTodayStudyComplete(stats);
        await saveStatsSynced(next);
        await setStats(next);
      } finally {
        syncingRef.current = false;
      }
    })();
  }, [dataset, progress, stats, setStats]);
}
