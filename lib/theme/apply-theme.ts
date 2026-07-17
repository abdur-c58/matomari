import type { AppliedTheme, ThemeMode } from "@/lib/constants/theme";

export function resolveAppliedTheme(
  themeMode: ThemeMode,
  systemDark: boolean
): AppliedTheme {
  if (themeMode === "light") return "light";
  if (themeMode === "paper-dark") return "paper-dark";
  if (themeMode === "dark") return "dark";
  return systemDark ? "paper-dark" : "light";
}

export function applyThemeToDocument(
  themeMode: ThemeMode,
  systemDark = false
): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const applied = resolveAppliedTheme(themeMode, systemDark);

  root.dataset.theme = applied;
  root.dataset.themeMode = themeMode;
  root.style.colorScheme = applied === "light" ? "light" : "dark";

  const themeColor =
    applied === "dark"
      ? "#000000"
      : applied === "paper-dark"
        ? "#211d16"
        : "#d2c5a4";
  let meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"][data-runtime-theme]'
  );
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.dataset.runtimeTheme = "";
    document.head.appendChild(meta);
  }
  meta.content = themeColor;
}
