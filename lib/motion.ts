import type { Transition, Variants } from "framer-motion";

export const smoothTransition: Transition = {
  duration: 0.32,
  ease: [0.22, 1, 0.36, 1],
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export const fadeUpExit = fadeUp;

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
  exit: {
    transition: { staggerChildren: 0.03, staggerDirection: -1 },
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const collapse: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 },
};

export const scaleTap = { scale: 0.97 };

export const desktopHover = {
  scale: 1.01,
  y: -2,
  transition: { duration: 0.15, ease: [0.22, 1, 0.36, 1] },
};

export const slideSheet: Variants = {
  hidden: { opacity: 0, y: "100%" },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: "100%" },
};

export const defaultTransition: Transition = smoothTransition;

export const springTransition: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 32,
};

export const springOverlay: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 34,
};

export const pageTransition: Transition = smoothTransition;
