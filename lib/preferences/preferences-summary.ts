import type { AppSettings } from "@/types/progress";
import { getDialectLabel } from "@/lib/constants/dialect";
import { summarizeNotificationPreferences } from "@/lib/notifications/notification-summary";

export function summarizePreferences(settings: AppSettings): string {
  const dialect = settings.dialectChosen
    ? getDialectLabel(settings.dialect)
    : "Dialect not chosen";
  return `${dialect} · ${summarizeNotificationPreferences(settings.notifications)}`;
}
