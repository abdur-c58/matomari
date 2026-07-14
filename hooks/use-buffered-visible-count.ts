"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAppScrollContainer } from "@/lib/utils/scroll-container";

export type BufferedVisibleOptions = {
  /** Items shown on first paint. */
  initial?: number;
  /** Extra items revealed each time the sentinel approaches the viewport. */
  step?: number;
  /**
   * How far ahead of the sentinel to start loading more (px).
   * Larger = more preloaded buffer before the user hits the end.
   */
  rootMarginPx?: number;
  /** Bump this when the list identity changes (filters, island key, etc.). */
  resetKey?: string | number;
};

/**
 * Progressive list windowing: mount a generous initial batch, then grow
 * as the user approaches the end so scrolling feels instant.
 */
export function useBufferedVisibleCount(
  total: number,
  {
    initial = 48,
    step = 48,
    rootMarginPx = 1200,
    resetKey = "",
  }: BufferedVisibleOptions = {}
) {
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(total, Math.max(initial, 0))
  );
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(Math.min(total, Math.max(initial, 0)));
  }, [total, initial, resetKey]);

  const revealMore = useCallback(() => {
    setVisibleCount((current) => {
      if (current >= total) return current;
      return Math.min(total, current + step);
    });
  }, [step, total]);

  /** Ensure a given index is mounted (e.g. playlist auto-scroll target). */
  const ensureVisible = useCallback(
    (index: number) => {
      if (index < 0) return;
      setVisibleCount((current) => {
        const needed = Math.min(total, index + 1 + Math.floor(step / 2));
        return current >= needed ? current : needed;
      });
    },
    [step, total]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= total) return;

    const root = getAppScrollContainer();
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) revealMore();
      },
      {
        root: root ?? null,
        threshold: 0,
        rootMargin: `0px 0px ${rootMarginPx}px 0px`,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [revealMore, rootMarginPx, total, visibleCount, resetKey]);

  // If the first batch still doesn't fill the viewport, keep revealing.
  useEffect(() => {
    if (visibleCount >= total) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const root = getAppScrollContainer();
    const rootRect = root
      ? root.getBoundingClientRect()
      : { top: 0, bottom: window.innerHeight };
    const rect = sentinel.getBoundingClientRect();
    if (rect.top <= rootRect.bottom + rootMarginPx) {
      revealMore();
    }
  }, [visibleCount, total, revealMore, rootMarginPx, resetKey]);

  return {
    visibleCount: Math.min(visibleCount, total),
    hasMore: visibleCount < total,
    sentinelRef,
    ensureVisible,
    revealMore,
  };
}
