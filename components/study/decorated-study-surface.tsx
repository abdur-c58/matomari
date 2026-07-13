"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DecoratedStudySurfaceProps = {
  kanji: string;
  variant?: "island" | "pathway";
  className?: string;
  children: ReactNode;
};

export function DecoratedStudySurface({
  kanji,
  variant = "island",
  className,
  children,
}: DecoratedStudySurfaceProps) {
  return (
    <div
      className={cn(
        "decorated-study-surface",
        variant === "pathway" && "decorated-study-surface--pathway",
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
