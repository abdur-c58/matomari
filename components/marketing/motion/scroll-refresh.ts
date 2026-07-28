"use client";

import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * ScrollTrigger.refresh() forces a full layout pass over every trigger and pin
 * spacer on the page. The marketing page has three pinned sections plus ~20
 * scrub triggers on 3D/blurred DOM, so an uncoordinated refresh-per-section
 * (eight sections mounting at slightly different times) locks the main thread
 * hard enough to freeze or crash desktop browsers.
 *
 * Every caller shares one trailing-edge refresh instead.
 */
const REFRESH_DEBOUNCE_MS = 220;

let timer = 0;

export function scheduleScrollRefresh(delay = REFRESH_DEBOUNCE_MS) {
  if (typeof window === "undefined") return;

  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = 0;
    ScrollTrigger.refresh();
  }, delay);
}

export function cancelScrollRefresh() {
  if (typeof window === "undefined") return;
  window.clearTimeout(timer);
  timer = 0;
}
