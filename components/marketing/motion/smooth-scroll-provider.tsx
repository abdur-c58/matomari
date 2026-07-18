"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  useIsDesktopMarketing,
  useIsFinePointer,
  usePrefersReducedMotion,
} from "./use-prefers-reduced-motion";

gsap.registerPlugin(ScrollTrigger);

type SmoothScrollContextValue = {
  lenis: Lenis | null;
  ready: boolean;
};

const SmoothScrollContext = createContext<SmoothScrollContextValue>({
  lenis: null,
  ready: false,
});

export function useSmoothScroll() {
  return useContext(SmoothScrollContext);
}

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const isDesktop = useIsDesktopMarketing();
  const finePointer = useIsFinePointer();
  const [value, setValue] = useState<SmoothScrollContextValue>({
    lenis: null,
    ready: false,
  });

  // useLayoutEffect so Lenis + `ready` settle before the browser paints —
  // avoids one frame of unposed/stacked marketing layouts (FOUC).
  useLayoutEffect(() => {
    let cancelled = false;
    let instance: Lenis | null = null;
    let ticker: ((time: number) => void) | null = null;
    let resizeTimer = 0;

    // Native scroll on mobile / touch / reduced motion — Lenis only for
    // desktop fine-pointer wheel. Touch tablets ≥768px must not get Lenis.
    if (reduced || !isDesktop || !finePointer) {
      if (!cancelled) setValue({ lenis: null, ready: true });
      return () => {
        cancelled = true;
      };
    }

    instance = new Lenis({
      // Shorter inertia so wheel/trackpad always feels answered — pins no longer
      // absorb input into a long coast that feels like a dead stop.
      duration: 0.78,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1,
    });

    document.documentElement.classList.add("lenis", "lenis-smooth");
    instance.on("scroll", ScrollTrigger.update);

    // Browser may restore scroll before Lenis mounts — snap back on reload.
    const nav = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type === "reload") {
      instance.scrollTo(0, { immediate: true, force: true });
    }

    ticker = (time: number) => {
      instance?.raf(time * 1000);
    };
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);
    if (!cancelled) setValue({ lenis: instance, ready: true });

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => ScrollTrigger.refresh(), 160);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      if (ticker) gsap.ticker.remove(ticker);
      gsap.ticker.lagSmoothing(500, 33);
      document.documentElement.classList.remove("lenis", "lenis-smooth");
      instance?.destroy();
      // Section contexts own their ScrollTriggers via gsap.context().revert().
    };
  }, [reduced, isDesktop, finePointer]);

  return (
    <SmoothScrollContext.Provider value={value}>
      {children}
    </SmoothScrollContext.Provider>
  );
}
