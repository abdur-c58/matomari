"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeUp, pageTransition } from "@/lib/motion";

export function PageTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();

  if (reduce) return <>{children}</>;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeUp}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}
