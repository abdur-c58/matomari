"use client";

import { useEffect } from "react";
import { registerAppServiceWorker } from "@/lib/pwa/register-service-worker";

export function ServiceWorkerProvider() {
  useEffect(() => {
    void registerAppServiceWorker();
  }, []);

  return null;
}
