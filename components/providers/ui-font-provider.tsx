"use client";

import { useEffect, type ReactNode } from "react";
import { useApp } from "@/components/providers/app-provider";
import { resolveUiFont } from "@/lib/constants/ui-font";

export function UiFontProvider({ children }: { children: ReactNode }) {
  const { progress } = useApp();
  const uiFont = resolveUiFont(progress.settings.uiFont);

  useEffect(() => {
    document.documentElement.dataset.uiFont = uiFont;
  }, [uiFont]);

  return children;
}
