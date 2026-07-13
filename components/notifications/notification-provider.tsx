"use client";

import { useCallback, useEffect, useRef } from "react";
import { useApp } from "@/components/providers/app-provider";
import {
  collectPendingNotifications,
  mergeLastSent,
  showNotification,
} from "@/lib/notifications/notification-service";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { dataset, progress, setProgress } = useApp();
  const checkingRef = useRef(false);
  const progressRef = useRef(progress);
  const datasetRef = useRef(dataset);

  useEffect(() => {
    progressRef.current = progress;
    datasetRef.current = dataset;
  }, [progress, dataset]);

  const runChecks = useCallback(async () => {
    if (checkingRef.current) return;
    if (typeof window === "undefined" || Notification.permission !== "granted") return;

    const current = progressRef.current;
    const prefs = current.settings.notifications;
    if (!prefs?.masterEnabled) return;

    checkingRef.current = true;
    try {
      const pending = collectPendingNotifications(prefs, current, datasetRef.current);
      if (pending.length === 0) return;

      let lastSent = prefs.lastSent;

      for (const item of pending) {
        await showNotification(item);
        lastSent = mergeLastSent(lastSent, item.lastSentPatch);
      }

      await setProgress({
        ...current,
        settings: {
          ...current.settings,
          notifications: {
            ...prefs,
            lastSent,
          },
        },
      });
    } finally {
      checkingRef.current = false;
    }
  }, [setProgress]);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") void runChecks();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [runChecks]);

  useEffect(() => {
    const interval = window.setInterval(() => void runChecks(), CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [runChecks]);

  return <>{children}</>;
}
