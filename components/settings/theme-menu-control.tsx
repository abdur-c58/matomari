"use client";

import { useCallback } from "react";
import { useApp } from "@/components/providers/app-provider";
import { ThemeModeToggle } from "@/components/settings/theme-mode-toggle";
import type { ThemeMode } from "@/lib/constants/theme";
import { resolveThemeMode } from "@/lib/constants/theme";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeMenuControl({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { progress, setProgress } = useApp();
  const { setMode } = useTheme();
  const themeMode = resolveThemeMode(progress.settings.themeMode);

  const onChange = useCallback(
    async (mode: ThemeMode) => {
      const resolved = resolveThemeMode(mode);
      if (resolved === themeMode) return;

      setMode(resolved);
      await setProgress((current) => ({
        ...current,
        settings: { ...current.settings, themeMode: resolved },
      }));
    },
    [setMode, setProgress, themeMode]
  );
  return (
    <div className={cn("space-y-2", className)}>
      <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
        Theme
      </p>
      <ThemeModeToggle value={themeMode} onChange={onChange} compact={compact} />
    </div>
  );
}
