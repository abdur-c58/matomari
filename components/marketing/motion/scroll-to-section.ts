"use client";

import type Lenis from "lenis";

export const MARKETING_SECTION_IDS = [
  "features",
  "narration",
  "walkthrough",
] as const;

export type MarketingSectionId = (typeof MARKETING_SECTION_IDS)[number];

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
