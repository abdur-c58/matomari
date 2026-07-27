"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DecoratedStudySurfaceProps = {
  kanji: string;
  variant?: "scene" | "pathway" | "essentials" | "narration";
  className?: string;
  children: ReactNode;
};

export function DecoratedStudySurface({
  kanji,
  variant = "scene",
  className,
  children,
}: DecoratedStudySurfaceProps) {
  return (
    <div
      className={cn(
        "decorated-study-surface",
        variant === "pathway" && "decorated-study-surface--pathway",
        variant === "essentials" && "decorated-study-surface--essentials",
        variant === "narration" && "decorated-study-surface--narration",
        className
      )}
    >
      <span className="decorated-study-surface-kanji font-brush" aria-hidden="true">
        {kanji}
      </span>
      <div className="decorated-study-surface-body">{children}</div>
    </div>
  );
}
