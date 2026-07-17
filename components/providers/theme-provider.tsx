"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_THEME_MODE,
  resolveThemeMode,
  type AppliedTheme,
  type ThemeMode,
} from "@/lib/constants/theme";
import {
  applyThemeToDocument,
  resolveAppliedTheme,
} from "@/lib/theme/apply-theme";

export const THEME_STORAGE_KEY = "kotoshima-theme-mode";
const THEME_EVENT = "kotoshima-theme-change";

type ThemeContextValue = {
  mode: ThemeMode;
  appliedTheme: AppliedTheme;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_THEME_MODE;
  return resolveThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY));
}

function subscribeStoredMode(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

function subscribeSystem(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore(
    subscribeStoredMode,
    getStoredMode,
    () => DEFAULT_THEME_MODE
  );
  const systemDark = useSyncExternalStore(
    subscribeSystem,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false
  );
  const appliedTheme = resolveAppliedTheme(mode, systemDark);

  useEffect(() => {
    applyThemeToDocument(mode, systemDark);
  }, [mode, systemDark]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    const resolved = resolveThemeMode(nextMode);
    document.documentElement.classList.add("theme-changing");
    window.localStorage.setItem(THEME_STORAGE_KEY, resolved);
    window.dispatchEvent(new Event(THEME_EVENT));
    window.setTimeout(() => {
      document.documentElement.classList.remove("theme-changing");
    }, 520);
  }, []);

  const value = useMemo(
    () => ({ mode, appliedTheme, setMode }),
    [mode, appliedTheme, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
