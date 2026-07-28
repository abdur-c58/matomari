"use client";

// Cross-navigation guard: without this, a local variable reset on every page
// load can't prevent a reload<->register<->reload loop if the browser keeps
// seeing a "new" service worker (e.g. transient version skew across Vercel's
// edge network right after a deploy). That loop is what produces the browser's
// generic "This page couldn't load" network-failure interstitial in production.
const SW_RELOAD_GUARD_KEY = "matomari-sw-reloaded-at";
const SW_RELOAD_GUARD_WINDOW_MS = 15_000;

function canForceReloadForNewWorker(): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(SW_RELOAD_GUARD_KEY) ?? "0");
    if (Date.now() - last < SW_RELOAD_GUARD_WINDOW_MS) return false;
    window.sessionStorage.setItem(SW_RELOAD_GUARD_KEY, String(Date.now()));
    return true;
  } catch {
    // If sessionStorage is unavailable, err on the side of not reloading —
    // silently running an update in the background beats an infinite loop.
    return false;
  }
}

async function clearAppCaches(): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

export async function cleanupAppServiceWorkers(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));
    await clearAppCaches();
  } catch {
    // ignore cleanup failures
  }
}

export async function registerAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  // Never control the page during local Next/Turbopack HMR — stale chunk caches
  // cause "module factory is not available" / lucide icon import failures.
  const isLocalDev =
    process.env.NODE_ENV === "development" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (isLocalDev) {
    await cleanupAppServiceWorkers();
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });

    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          worker.postMessage({ type: "SKIP_WAITING" });
        }
      });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      if (!canForceReloadForNewWorker()) return;
      refreshing = true;
      window.location.reload();
    });

    return registration;
  } catch {
    return null;
  }
}
