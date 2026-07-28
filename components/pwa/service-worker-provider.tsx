"use client";

import { useEffect } from "react";
import { cleanupAppServiceWorkers } from "@/lib/pwa/register-service-worker";

export function ServiceWorkerProvider() {
  useEffect(() => {
    // Keep the web app free of persistent SW/cache interference.
    // Notifications still register the SW on demand when the user enables them.
    void cleanupAppServiceWorkers();
  }, []);

  return null;
}
