"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number | null;
  onChange?: (rating: number) => void;
  suggested?: number | null;
  readonly?: boolean;
  size?: "xs" | "sm" | "md";
  /** Tighter visual layout for compact card headers (use with size="xs"). */
  compact?: boolean;
}

export function StarRating({
  value,
  onChange,
  suggested,
  readonly = false,
  size = "md",
  compact = false,
}: StarRatingProps) {
  const iconSize =
    size === "xs" ? "h-3.5 w-3.5" : size === "sm" ? "h-5 w-5" : "h-7 w-7";
  const tapTarget = compact
    ? "min-h-8 min-w-8"
    : size === "xs"
      ? "min-h-8 min-w-8"
      : "min-h-11 min-w-11";
  const starGap = compact ? "gap-1.5" : size === "xs" ? "gap-1.5" : "gap-1";
  const mastered = value === 5;
  const interactive = !readonly && Boolean(onChange);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  return (
    <div
      className={cn(
        "flex items-center",
        starGap,
        mastered && "mastered-glow"
      )}
      onMouseLeave={interactive ? () => setHoveredStar(null) : undefined}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (value ?? 0) >= star;
        const isSuggested = suggested === star && value === null;
        const previewFilled = hoveredStar !== null && star <= hoveredStar;

        return (
          <motion.button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(star)}
            onMouseEnter={interactive ? () => setHoveredStar(star) : undefined}
            className={cn(
              "flex items-center justify-center touch-manipulation",
              compact ? "rounded-md" : "rounded-xl",
              tapTarget
            )}
            whileTap={interactive ? { scale: 0.85 } : undefined}
          >
            <Star
              className={cn(
                iconSize,
                previewFilled
                  ? "fill-warning/18 text-warning/40"
                  : filled
                    ? "fill-warning text-warning"
                    : isSuggested
                      ? "fill-warning/30 text-warning"
                      : "text-border"
              )}
            />
          </motion.button>
        );
      })}
    </div>
  );
}
