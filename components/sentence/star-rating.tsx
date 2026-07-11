"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number | null;
  onChange?: (rating: number) => void;
  suggested?: number | null;
  readonly?: boolean;
  size?: "sm" | "md";
}

export function StarRating({
  value,
  onChange,
  suggested,
  readonly = false,
  size = "md",
}: StarRatingProps) {
  const iconSize = size === "sm" ? "h-5 w-5" : "h-7 w-7";
  const mastered = value === 5;

  return (
    <div className={cn("flex items-center gap-0.5", mastered && "mastered-glow")}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (value ?? 0) >= star;
        const isSuggested = suggested === star && value === null;

        return (
          <motion.button
            key={star}
            type="button"
            disabled={readonly || !onChange}
            onClick={() => onChange?.(star)}
            className={cn(
              "flex min-h-11 min-w-11 items-center justify-center rounded-xl touch-manipulation",
              !readonly && "hover:bg-warning/10"
            )}
            whileTap={readonly ? undefined : { scale: 0.85 }}
          >
            <Star
              className={cn(
                iconSize,
                filled
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
