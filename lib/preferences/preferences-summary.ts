import type { AppSettings } from "@/types/progress";
import { getUiFontLabel } from "@/lib/constants/ui-font";
import { summarizeNotificationPreferences } from "@/lib/notifications/notification-summary";
import { summarizeTranslationPreferences } from "@/lib/preferences/translation-preferences";

export function summarizePreferences(settings: AppSettings): string {
  const dialect = summarizeTranslationPreferences(settings);
  return `${getUiFontLabel(settings.uiFont)} · ${dialect} · ${summarizeNotificationPreferences(settings.notifications)}`;
}
