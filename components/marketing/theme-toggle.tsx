"use client";

import { Moon, MoonStar, Sun, SunDim } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import {
  themeModeLabel,
  type AppliedTheme,
} from "@/lib/constants/theme";
import { cn } from "@/lib/utils";

const THEME_CYCLE: AppliedTheme[] = [
  "light",
  "paper-dark",
  "true-light",
  "dark",
];

export function MarketingThemeToggle({ className }: { className?: string }) {
  const { appliedTheme, setMode } = useTheme();
  const currentIndex = Math.max(0, THEME_CYCLE.indexOf(appliedTheme));
  const nextTheme = THEME_CYCLE[(currentIndex + 1) % THEME_CYCLE.length];
  const nextLabel = themeModeLabel(nextTheme).toLowerCase();

  return (
    <button
      type="button"
      className={cn(
        "group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface/80 text-foreground shadow-sm backdrop-blur-md transition-[background-color,border-color,color,transform] duration-300 hover:bg-surface-raised active:scale-[0.94] md:h-9 md:w-9",
        className
      )}
      onClick={() => setMode(nextTheme)}
      aria-label={`Switch to ${nextLabel} theme`}
      title={`Switch to ${nextLabel} theme`}
    >
      <Sun
        className={cn(
          "absolute h-4 w-4 transition-[transform,opacity] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
          appliedTheme === "light"
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-50 opacity-0"
        )}
      />
      <MoonStar
        className={cn(
          "absolute h-4 w-4 transition-[transform,opacity] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
          appliedTheme === "paper-dark"
            ? "rotate-0 scale-100 opacity-100"
            : "rotate-90 scale-50 opacity-0"
        )}
      />
      <SunDim
        className={cn(
          "absolute h-4 w-4 transition-[transform,opacity] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
          appliedTheme === "true-light"
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-50 opacity-0"
        )}
      />
      <Moon
        className={cn(
          "absolute h-4 w-4 transition-[transform,opacity] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
          appliedTheme === "dark"
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-50 opacity-0"
        )}
      />
    </button>
  );
}
