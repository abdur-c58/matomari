import type { AppSettings } from "@/types/progress";
import { getDialectLabel } from "@/lib/constants/dialect";
import { getUiFontLabel } from "@/lib/constants/ui-font";
import { summarizeNotificationPreferences } from "@/lib/notifications/notification-summary";

export function summarizePreferences(settings: AppSettings): string {
  const dialect = settings.dialectChosen
    ? getDialectLabel(settings.dialect)
    : "Dialect not chosen";
  return `${getUiFontLabel(settings.uiFont)} · ${dialect} · ${summarizeNotificationPreferences(settings.notifications)}`;
}
