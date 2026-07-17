"use client";

import { Monitor, Moon, MoonStar, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ThemeMode } from "@/lib/constants/theme";
import { cn } from "@/lib/utils";

const MODES: {
  value: ThemeMode;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}[] = [
  { value: "system", label: "System theme", shortLabel: "Auto", icon: Monitor },
  { value: "light", label: "Light washi", shortLabel: "Light", icon: Sun },
  {
    value: "paper-dark",
    label: "Dark washi",
    shortLabel: "Washi dark",
    icon: MoonStar,
  },
  { value: "dark", label: "True black", shortLabel: "Dark", icon: Moon },
];

export function ThemeModeToggle({
  value,
  onChange,
  compact = false,
  className,
}: {
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex w-full items-stretch gap-0.5 rounded-lg border border-border bg-background p-0.5",
        className
      )}
      role="group"
      aria-label="Theme"
    >
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const active = value === mode.value;
        return (
          <Button
            key={mode.value}
            type="button"
            size="sm"
            variant={active ? "default" : "ghost"}
            className={cn(
              "min-h-0 overflow-hidden transition-[flex-grow,padding,background-color,color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
              compact ? "h-7" : "h-8",
              active
                ? "flex-[1.35] justify-center gap-1.5 px-2.5"
                : "flex-none justify-center gap-0 px-2"
            )}
            onClick={() => onChange(mode.value)}
            aria-label={mode.label}
            aria-pressed={active}
            title={mode.label}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span
              className={cn(
                "inline-block overflow-hidden whitespace-nowrap text-xs transition-[max-width,opacity,transform,margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                active
                  ? "ml-0 max-w-[5.5rem] translate-x-0 scale-100 opacity-100"
                  : "ml-0 max-w-0 -translate-x-1 scale-95 opacity-0"
              )}
              aria-hidden={!active}
            >
              {mode.shortLabel}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
