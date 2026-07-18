"use client";

/**
 * Lightweight mobile scroll reveals — fade + slide-up, no pinning / 3D scrub.
 * Use alongside desktop MARKETING_DESKTOP_MQ scrub animations.
 */
import gsap from "gsap";
import { MARKETING_EASE_GSAP } from "@/components/marketing/motion/easings";

export const MARKETING_MOBILE_MQ = "(max-width: 767px)";

type RevealOptions = {
  y?: number;
  stagger?: number;
  start?: string;
  duration?: number;
  trigger?: Element | string;
};

export function revealOnMobile(
  mm: ReturnType<typeof gsap.matchMedia>,
  root: HTMLElement,
  selector: string,
  options?: RevealOptions
) {
  mm.add(MARKETING_MOBILE_MQ, () => {
    const targets = root.querySelectorAll(selector);
    if (!targets.length) return;

    gsap.fromTo(
      targets,
      { opacity: 0, y: options?.y ?? 22 },
      {
        opacity: 1,
        y: 0,
        stagger: options?.stagger ?? 0.1,
        duration: options?.duration ?? 0.7,
        ease: MARKETING_EASE_GSAP,
        scrollTrigger: {
          trigger: options?.trigger ?? root,
          start: options?.start ?? "top 84%",
          toggleActions: "play none none reverse",
        },
      }
    );
  });
}
