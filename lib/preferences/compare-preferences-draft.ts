import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "@/lib/constants/notifications";
import type { UiFont } from "@/lib/constants/ui-font";
import { resolveUiFont } from "@/lib/constants/ui-font";
import type { AppSettings } from "@/types/progress";

export type PreferencesDraft = {
  showKansaiDialect: boolean;
  kansaiAsPrimary: boolean;
  uiFont: UiFont;
  notifications: NotificationPreferences;
};

function effectiveKansaiPrimary(draft: PreferencesDraft): boolean {
  return draft.showKansaiDialect ? draft.kansaiAsPrimary : false;
}

function savedPreferencesDraft(settings: AppSettings): PreferencesDraft {
  return {
    showKansaiDialect: settings.showKansaiDialect ?? false,
    kansaiAsPrimary: settings.kansaiAsPrimary ?? false,
    uiFont: resolveUiFont(settings.uiFont),
    notifications: settings.notifications ?? DEFAULT_NOTIFICATION_PREFERENCES,
  };
}

export function preferencesDraftHasChanges(
  draft: PreferencesDraft,
  settings: AppSettings
): boolean {
  const saved = savedPreferencesDraft(settings);
  return (
    draft.showKansaiDialect !== saved.showKansaiDialect ||
    effectiveKansaiPrimary(draft) !== effectiveKansaiPrimary(saved) ||
    resolveUiFont(draft.uiFont) !== saved.uiFont ||
    JSON.stringify(draft.notifications) !== JSON.stringify(saved.notifications)
  );
}
