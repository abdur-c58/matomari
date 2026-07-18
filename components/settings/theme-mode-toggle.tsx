"use client";

import { Circle, Monitor, Moon, Scroll, Sun } from "lucide-react";
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
  icon: LucideIcon;
}[] = [
  { value: "washi", label: "Washi paper", shortLabel: "Washi", icon: Scroll },
  { value: "normal", label: "Normal", shortLabel: "Normal", icon: Circle },
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

function ExpandableLabel({
  active,
  children,
  maxWidthClass,
}: {
  active: boolean;
  children: string;
  maxWidthClass: string;
}) {
  return (
    <span
      className={cn(
        "inline-block overflow-hidden whitespace-nowrap text-xs transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        active ? cn(maxWidthClass, "opacity-100") : "max-w-0 opacity-0"
      )}
      aria-hidden={!active}
    >
      {children}
    </span>
  );
}

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
          <ExpandableLabel active={isSystem} maxWidthClass="max-w-[3.5rem]">
            Auto
          </ExpandableLabel>
        </Button>

        {FAMILIES.map((item) => {
          const Icon = item.icon;
          const active = !isSystem && family === item.value;
          return (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={active ? "default" : "ghost"}
              className={cn(
                "min-h-0 overflow-hidden transition-[flex-grow,padding,background-color,color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                compact ? "h-7" : "h-8",
                active
                  ? "flex-[1.35] justify-center gap-1.5 px-2.5"
                  : "flex-1 justify-center gap-0 px-2"
              )}
              onClick={() => onChange(themeFromAxes(item.value, polarity))}
              aria-label={item.label}
              aria-pressed={active}
              title={item.label}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <ExpandableLabel active={active} maxWidthClass="max-w-[4rem]">
                {item.shortLabel}
              </ExpandableLabel>
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
                "min-h-0 overflow-hidden transition-[flex-grow,padding,background-color,color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                compact ? "h-7" : "h-8",
                active
                  ? "flex-[1.25] justify-center gap-1.5 px-2.5"
                  : "flex-1 justify-center gap-0 px-2"
              )}
              onClick={() => onChange(themeFromAxes(family, item.value))}
              aria-label={item.label}
              aria-pressed={active}
              title={item.label}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <ExpandableLabel active={active} maxWidthClass="max-w-[3.5rem]">
                {item.shortLabel}
              </ExpandableLabel>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
