"use client";

import { useLayoutEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSmoothScroll } from "./smooth-scroll-provider";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

gsap.registerPlugin(ScrollTrigger);

type SetupFn = (ctx: gsap.Context) => void | (() => void);

/**
 * Scoped GSAP context bound to a root element. Cleans up on unmount.
 * Skips setup when reduced motion is preferred unless `force` is true.
 */
export function useGsapContext(
  rootRef: RefObject<HTMLElement | null>,
  setup: SetupFn,
  deps: unknown[] = [],
  options?: { force?: boolean }
) {
  const { ready } = useSmoothScroll();
  const reduced = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!ready || !root) return;
    if (reduced && !options?.force) return;

    let extraCleanup: void | (() => void);

    const ctx = gsap.context((self) => {
      extraCleanup = setup(self);
    }, root);

    // Mark the marketing page ready after this section's initial GSAP state is applied.
    const page = root.closest(".marketing-page");
    if (page instanceof HTMLElement) {
      page.dataset.motionReady = "true";
    }

    // Single deferred refresh per context — no per-instance load listeners.
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 180);

    return () => {
      window.clearTimeout(t);
      extraCleanup?.();
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, reduced, rootRef, options?.force, ...deps]);
}
