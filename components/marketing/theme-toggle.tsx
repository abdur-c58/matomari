"use client";

import { Moon, MoonStar, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import type { AppliedTheme } from "@/lib/constants/theme";
import { cn } from "@/lib/utils";

const THEME_CYCLE: AppliedTheme[] = ["light", "paper-dark", "dark"];

export function MarketingThemeToggle({ className }: { className?: string }) {
  const { appliedTheme, setMode } = useTheme();
  const currentIndex = THEME_CYCLE.indexOf(appliedTheme);
  const nextTheme = THEME_CYCLE[(currentIndex + 1) % THEME_CYCLE.length];
  const nextLabel =
    nextTheme === "light"
      ? "light washi"
      : nextTheme === "paper-dark"
        ? "dark washi"
        : "true black";

  return (
    <button
      type="button"
      className={cn(
        "group relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface/80 text-foreground shadow-sm backdrop-blur-md transition-[background-color,border-color,color,transform] duration-300 hover:bg-surface-raised active:scale-[0.94]",
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
