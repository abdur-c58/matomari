export const THEME_MODES = ["system", "light", "paper-dark", "dark"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];
export type AppliedTheme = Exclude<ThemeMode, "system">;

export const DEFAULT_THEME_MODE: ThemeMode = "system";

export function resolveThemeMode(value?: string | null): ThemeMode {
  if (
    value === "light" ||
    value === "paper-dark" ||
    value === "dark" ||
    value === "system"
  ) {
    return value;
  }
  return DEFAULT_THEME_MODE;
}
