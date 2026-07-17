"use client";

import {
  useRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import { MARKETING_EASE_GSAP } from "./easings";
import {
  useIsFinePointer,
  usePrefersReducedMotion,
} from "./use-prefers-reduced-motion";

type MagneticButtonProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  strength?: number;
};

export function MagneticButton({
  children,
  className,
  strength = 0.32,
  ...props
}: MagneticButtonProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const fine = useIsFinePointer();
  const setters = useRef<{
    x: gsap.QuickToFunc;
    y: gsap.QuickToFunc;
  } | null>(null);

  const ensure = () => {
    if (!rootRef.current || setters.current) return;
    setters.current = {
      x: gsap.quickTo(rootRef.current, "x", {
        duration: 0.55,
        ease: MARKETING_EASE_GSAP,
      }),
      y: gsap.quickTo(rootRef.current, "y", {
        duration: 0.55,
        ease: MARKETING_EASE_GSAP,
      }),
    };
  };

  const onMove = (event: MouseEvent<HTMLDivElement>) => {
    if (reduced || !fine || !rootRef.current) return;
    ensure();
    const rect = rootRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    setters.current?.x(x * strength);
    setters.current?.y(y * strength);
  };

  const onLeave = () => {
    if (reduced || !fine) return;
    setters.current?.x(0);
    setters.current?.y(0);
  };

  return (
    <div
      ref={rootRef}
      className={cn("inline-flex", className)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      {...props}
    >
      {children}
    </div>
  );
}
