"use client";

import { Monitor, Moon, MoonStar, Sun, SunDim } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/providers/theme-provider";
import {
  themeFamily,
  themeFromAxes,
  themePolarity,
  type ThemeFamily,
  type ThemeMode,
  type ThemePolarity,
} from "@/lib/constants/theme";
import { cn } from "@/lib/utils";

const FAMILIES: {
  value: ThemeFamily;
  label: string;
  shortLabel: string;
}[] = [
  { value: "washi", label: "Washi paper", shortLabel: "Washi" },
  { value: "normal", label: "Normal", shortLabel: "Normal" },
];

const POLARITIES: {
  value: ThemePolarity;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}[] = [
  { value: "light", label: "Light", shortLabel: "Light", icon: Sun },
  { value: "dark", label: "Dark", shortLabel: "Dark", icon: Moon },
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
  const { appliedTheme } = useTheme();
  const family = themeFamily(appliedTheme);
  const polarity = themePolarity(appliedTheme);
  const isSystem = value === "system";

  return (
    <div className={cn("flex w-full flex-col gap-1", className)}>
      <div
        className="inline-flex w-full items-stretch gap-0.5 rounded-lg border border-border bg-background p-0.5"
        role="group"
        aria-label="Theme family"
      >
        <Button
          type="button"
          size="sm"
          variant={isSystem ? "default" : "ghost"}
          className={cn(
            "min-h-0 overflow-hidden transition-[flex-grow,padding,background-color,color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            compact ? "h-7" : "h-8",
            isSystem
              ? "flex-[1.2] justify-center gap-1.5 px-2.5"
              : "flex-none justify-center gap-0 px-2"
          )}
          onClick={() => onChange("system")}
          aria-label="System theme"
          aria-pressed={isSystem}
          title="System theme"
        >
          <Monitor className="h-3.5 w-3.5 shrink-0" />
          <span
            className={cn(
              "inline-block overflow-hidden whitespace-nowrap text-xs transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
              isSystem ? "max-w-[3.5rem] opacity-100" : "max-w-0 opacity-0"
            )}
            aria-hidden={!isSystem}
          >
            Auto
          </span>
        </Button>

        {FAMILIES.map((item) => {
          const active = !isSystem && family === item.value;
          return (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={active ? "default" : "ghost"}
              className={cn(
                "min-h-0 flex-1 overflow-hidden transition-[background-color,color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                compact ? "h-7" : "h-8",
                "justify-center gap-1.5 px-2"
              )}
              onClick={() => onChange(themeFromAxes(item.value, polarity))}
              aria-label={item.label}
              aria-pressed={active}
              title={item.label}
            >
              {item.value === "washi" ? (
                <MoonStar className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <SunDim className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="text-xs">{item.shortLabel}</span>
            </Button>
          );
        })}
      </div>

      <div
        className="inline-flex w-full items-stretch gap-0.5 rounded-lg border border-border bg-background p-0.5"
        role="group"
        aria-label="Light or dark"
      >
        {POLARITIES.map((item) => {
          const Icon = item.icon;
          const active = !isSystem && polarity === item.value;
          return (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={active ? "default" : "ghost"}
              className={cn(
                "min-h-0 flex-1 overflow-hidden transition-[background-color,color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                compact ? "h-7" : "h-8",
                "justify-center gap-1.5 px-2"
              )}
              onClick={() => onChange(themeFromAxes(family, item.value))}
              aria-label={item.label}
              aria-pressed={active}
              title={item.label}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs">{item.shortLabel}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
