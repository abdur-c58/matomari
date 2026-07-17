"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import {
  useIsFinePointer,
  usePrefersReducedMotion,
} from "./use-prefers-reduced-motion";
import { MARKETING_EASE_GSAP } from "./easings";

type PointerTiltOptions = {
  maxX?: number;
  maxY?: number;
  /** Selector for the nested pointer-rig element inside root. Defaults to [data-pointer-rig]. */
  rigSelector?: string;
};

/**
 * Nested pointer tilt on a dedicated rig element so it does not overwrite
 * scroll-driven transforms on the parent scroll-rig.
 */
export function usePointerTilt(
  rootRef: RefObject<HTMLElement | null>,
  options: PointerTiltOptions = {}
) {
  const reduced = usePrefersReducedMotion();
  const finePointer = useIsFinePointer();
  const { maxX = 6, maxY = 5, rigSelector = "[data-pointer-rig]" } = options;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced || !finePointer) return;

    const rig = root.querySelector<HTMLElement>(rigSelector);
    if (!rig) return;

    let bounds = root.getBoundingClientRect();
    let raf = 0;
    let latestX = 0;
    let latestY = 0;

    const measure = () => {
      bounds = root.getBoundingClientRect();
    };

    const onMove = (event: PointerEvent) => {
      latestX = event.clientX;
      latestY = event.clientY;
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const px = (latestX - bounds.left) / Math.max(1, bounds.width) - 0.5;
        const py = (latestY - bounds.top) / Math.max(1, bounds.height) - 0.5;
        gsap.to(rig, {
          rotateY: px * maxX * 2,
          rotateX: -py * maxY * 2,
          duration: 0.55,
          ease: MARKETING_EASE_GSAP,
          overwrite: "auto",
        });
      });
    };

    const onLeave = () => {
      gsap.to(rig, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.7,
        ease: MARKETING_EASE_GSAP,
        overwrite: "auto",
      });
    };

    root.addEventListener("pointerenter", measure);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", measure);

    return () => {
      window.cancelAnimationFrame(raf);
      root.removeEventListener("pointerenter", measure);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", measure);
      gsap.killTweensOf(rig);
      gsap.set(rig, { rotateX: 0, rotateY: 0 });
    };
  }, [rootRef, reduced, finePointer, maxX, maxY, rigSelector]);
}
