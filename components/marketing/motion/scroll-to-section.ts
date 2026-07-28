"use client";

import type Lenis from "lenis";

export const MARKETING_SECTION_IDS = [
  "hero",
  "narration",
  "problem",
  "features",
  "scenes",
  "social-proof",
  "pricing",
  "cta",
] as const;

export type MarketingSectionId = (typeof MARKETING_SECTION_IDS)[number];

export const MARKETING_SECTION_LINKS = [
  { id: "hero", label: "Home" },
  { id: "narration", label: "Narration" },
  { id: "problem", label: "The gap" },
  { id: "features", label: "Daily loop" },
  { id: "scenes", label: "Scenes" },
  { id: "social-proof", label: "Social" },
  { id: "pricing", label: "Pricing" },
  { id: "cta", label: "Start" },
] as const satisfies ReadonlyArray<{ id: MarketingSectionId; label: string }>;

const PENDING_KEY = "marketing-pending-section";
const DEFAULT_SCROLL_DURATION = 1.8;
let nativeScrollFrame: number | null = null;

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

export function isMarketingSectionId(value: string): value is MarketingSectionId {
  return (MARKETING_SECTION_IDS as readonly string[]).includes(value);
}

export function rememberMarketingSection(id: MarketingSectionId) {
  try {
    sessionStorage.setItem(PENDING_KEY, id);
  } catch {
    // Ignore storage failures (private mode, etc.).
  }
}

export function consumePendingMarketingSection(): MarketingSectionId | null {
  try {
    const value = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    if (value && isMarketingSectionId(value)) return value;
  } catch {
    // Ignore storage failures.
  }
  return null;
}

/** True when this document load is a browser refresh/reload. */
export function isPageReload(): boolean {
  if (typeof performance === "undefined") return false;
  const entry = performance.getEntriesByType?.(
    "navigation"
  )[0] as PerformanceNavigationTiming | undefined;
  if (entry?.type === "reload") return true;
  // Legacy fallback
  const legacy = (
    performance as Performance & { navigation?: { type?: number } }
  ).navigation;
  return legacy?.type === 1;
}

/** Jump to the top of the page (Lenis-aware when available). */
export function scrollMarketingToTop(lenis: Lenis | null) {
  if (lenis) {
    lenis.scrollTo(0, { immediate: true, force: true });
    return;
  }
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

/** Smooth-scroll to a section without writing a hash into the URL. */
export function scrollToMarketingSection(
  id: MarketingSectionId,
  lenis: Lenis | null,
  options?: { offset?: number; duration?: number }
) {
  const target = document.getElementById(id);
  if (!target) return false;

  if (typeof window !== "undefined" && window.location.hash) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  const offset = options?.offset ?? -24;
  const duration = options?.duration ?? DEFAULT_SCROLL_DURATION;

  if (lenis) {
    lenis.scrollTo(target, {
      offset,
      duration,
      easing: easeInOutCubic,
      force: true,
    });
    return true;
  }

  const top = target.getBoundingClientRect().top + window.scrollY + offset;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo({ top });
    return true;
  }

  if (nativeScrollFrame !== null) {
    window.cancelAnimationFrame(nativeScrollFrame);
  }

  const startTop = window.scrollY;
  const distance = top - startTop;
  const startedAt = performance.now();

  const animate = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / (duration * 1000));
    window.scrollTo({ top: startTop + distance * easeInOutCubic(progress) });

    if (progress < 1) {
      nativeScrollFrame = window.requestAnimationFrame(animate);
    } else {
      nativeScrollFrame = null;
    }
  };

  nativeScrollFrame = window.requestAnimationFrame(animate);
  return true;
}
