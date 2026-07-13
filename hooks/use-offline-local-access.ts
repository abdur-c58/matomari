"use client";

import { useEffect, useState } from "react";
import { loadLocalSnapshot } from "@/lib/sync/sync-service";

export function useOfflineLocalAccess() {
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const evaluate = async () => {
      if (typeof navigator === "undefined" || navigator.onLine) {
        if (!cancelled) {
          setAllowed(false);
          setChecked(true);
        }
        return;
      }

      try {
        const snapshot = await loadLocalSnapshot();
        const hasLocal =
          Boolean(snapshot.dataset) ||
          Object.keys(snapshot.progress?.sentences ?? {}).length > 0 ||
          Boolean(snapshot.library && Object.keys(snapshot.library.islands ?? {}).length > 0);

        if (!cancelled) {
          setAllowed(hasLocal);
          setChecked(true);
        }
      } catch {
        if (!cancelled) {
          setAllowed(false);
          setChecked(true);
        }
      }
    };

    void evaluate();

    const onOnline = () => {
      setAllowed(false);
      setChecked(true);
    };
    const onOffline = () => {
      setChecked(false);
      void evaluate();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return { allowed, checked };
}
