import type { AppSettings } from "@/types/progress";
import { resolveThemeMode, themeModeLabel } from "@/lib/constants/theme";
import { getUiFontLabel } from "@/lib/constants/ui-font";
import { summarizeNotificationPreferences } from "@/lib/notifications/notification-summary";
import { summarizeTranslationPreferences } from "@/lib/preferences/translation-preferences";

export function summarizePreferences(settings: AppSettings): string {
  const dialect = summarizeTranslationPreferences(settings);
  const themeLabel = themeModeLabel(resolveThemeMode(settings.themeMode));
  return `${themeLabel} · ${getUiFontLabel(settings.uiFont)} · ${dialect} · ${summarizeNotificationPreferences(settings.notifications)}`;
}
