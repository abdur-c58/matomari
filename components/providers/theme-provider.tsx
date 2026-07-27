"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

export const THEME_STORAGE_KEY = "matomari-theme-mode";
const THEME_EVENT = "matomari-theme-change";
const THEME_TRANSITION_MS = 280;

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

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function commitThemeMode(resolved: ThemeMode, systemDark: boolean) {
  window.localStorage.setItem(THEME_STORAGE_KEY, resolved);
  applyThemeToDocument(resolved, systemDark);
  window.dispatchEvent(new Event(THEME_EVENT));
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
  const clearingRef = useRef(0);

  useEffect(() => {
    applyThemeToDocument(mode, systemDark);
  }, [mode, systemDark]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    const resolved = resolveThemeMode(nextMode);
    if (resolved === getStoredMode()) return;

    const systemIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const run = () => commitThemeMode(resolved, systemIsDark);

    // View Transitions: one GPU crossfade of the painted page — much cheaper
    // than transitioning colors on every button/section/article in the tree.
    const doc = document as Document & {
      startViewTransition?: (update: () => void) => { finished: Promise<void> };
    };

    if (
      typeof doc.startViewTransition === "function" &&
      !prefersReducedMotion()
    ) {
      const transition = doc.startViewTransition(run);
      void transition.finished.catch(() => undefined);
      return;
    }

    const root = document.documentElement;
    window.clearTimeout(clearingRef.current);
    root.classList.add("theme-changing");
    run();
    clearingRef.current = window.setTimeout(() => {
      root.classList.remove("theme-changing");
    }, THEME_TRANSITION_MS);
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
