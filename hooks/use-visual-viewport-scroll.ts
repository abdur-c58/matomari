"use client";

import { useEffect } from "react";

/** Keeps a scroll container pinned to bottom when the mobile keyboard resizes the viewport. */
export function useVisualViewportScroll(
  scrollRef: React.RefObject<HTMLElement | null>,
  enabled: boolean,
  deps: unknown[] = []
) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior });
    };

    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => scrollToBottom("auto");
    vv.addEventListener("resize", onResize);
    scrollToBottom("auto");

    return () => vv.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps forwarded from caller
  }, [enabled, scrollRef, ...deps]);
}
