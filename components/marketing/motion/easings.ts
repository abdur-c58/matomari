/** Promo settle curve — smooth deceleration, no linear visual motion. */
export const MARKETING_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/** GSAP named ease approximating the promo settle curve. */
export const MARKETING_EASE_GSAP = "power3.out";

export const MARKETING_DESKTOP_MQ = "(min-width: 768px)";
export const MARKETING_REDUCED_MQ = "(prefers-reduced-motion: reduce)";

/** Bounded 3D travel — keep compositor cost predictable. */
export const MARKETING_Z = {
  far: -160,
  mid: -70,
  near: 55,
  push: 90,
} as const;
