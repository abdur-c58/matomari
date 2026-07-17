import type { AppSettings } from "@/types/progress";
import { resolveThemeMode } from "@/lib/constants/theme";
import { getUiFontLabel } from "@/lib/constants/ui-font";
import { summarizeNotificationPreferences } from "@/lib/notifications/notification-summary";
import { summarizeTranslationPreferences } from "@/lib/preferences/translation-preferences";

export function summarizePreferences(settings: AppSettings): string {
  const dialect = summarizeTranslationPreferences(settings);
  const theme = resolveThemeMode(settings.themeMode);
  const themeLabel =
    theme === "system"
      ? "System theme"
      : theme === "dark"
        ? "Dark"
        : theme === "paper-dark"
          ? "Washi dark"
          : "Light";
  return `${themeLabel} · ${getUiFontLabel(settings.uiFont)} · ${dialect} · ${summarizeNotificationPreferences(settings.notifications)}`;
}
