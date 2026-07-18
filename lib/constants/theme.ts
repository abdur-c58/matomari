export const THEME_MODES = [
  "system",
  "light",
  "paper-dark",
  "true-light",
  "dark",
] as const;

export type ThemeMode = (typeof THEME_MODES)[number];
export type AppliedTheme = Exclude<ThemeMode, "system">;

/** Paper aesthetic vs clean neutral. */
export type ThemeFamily = "washi" | "normal";

/** Brightness axis within a family. */
export type ThemePolarity = "light" | "dark";

export const DEFAULT_THEME_MODE: ThemeMode = "system";

export const APPLIED_THEMES: AppliedTheme[] = [
  "light",
  "paper-dark",
  "true-light",
  "dark",
];

export function resolveThemeMode(value?: string | null): ThemeMode {
  if (
    value === "light" ||
    value === "paper-dark" ||
    value === "true-light" ||
    value === "dark" ||
    value === "system"
  ) {
    return value;
  }
  return DEFAULT_THEME_MODE;
}

export function themeFamily(theme: AppliedTheme): ThemeFamily {
  return theme === "light" || theme === "paper-dark" ? "washi" : "normal";
}

export function themePolarity(theme: AppliedTheme): ThemePolarity {
  return theme === "light" || theme === "true-light" ? "light" : "dark";
}

export function themeFromAxes(
  family: ThemeFamily,
  polarity: ThemePolarity
): AppliedTheme {
  if (family === "washi") {
    return polarity === "light" ? "light" : "paper-dark";
  }
  return polarity === "light" ? "true-light" : "dark";
}

export function themeModeLabel(mode: ThemeMode): string {
  switch (mode) {
    case "system":
      return "System theme";
    case "light":
      return "Washi light";
    case "paper-dark":
      return "Washi dark";
    case "true-light":
      return "True light";
    case "dark":
      return "True dark";
  }
}
