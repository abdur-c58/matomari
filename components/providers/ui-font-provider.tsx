"use client";

import { useEffect, type ReactNode } from "react";
import { useApp } from "@/components/providers/app-provider";
import { resolveThemeMode } from "@/lib/constants/theme";
import { resolveUiFont } from "@/lib/constants/ui-font";
import { useTheme } from "@/components/providers/theme-provider";

export function UiFontProvider({ children }: { children: ReactNode }) {
  const { progress, loading } = useApp();
  const { setMode } = useTheme();
  const uiFont = resolveUiFont(progress.settings.uiFont);
  const themeMode = resolveThemeMode(progress.settings.themeMode);

  useEffect(() => {
    document.documentElement.dataset.uiFont = uiFont;
  }, [uiFont]);

  useEffect(() => {
    if (!loading) setMode(themeMode);
  }, [loading, setMode, themeMode]);

  return children;
}
