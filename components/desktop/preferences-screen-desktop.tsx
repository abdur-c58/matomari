"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { DesktopPageShell } from "@/components/layout/desktop-page-shell";
import { DesktopPageHeader } from "@/components/layout/desktop-page-header";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { UiFont } from "@/lib/constants/ui-font";
import { resolveUiFont } from "@/lib/constants/ui-font";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "@/lib/constants/notifications";
import { NotificationPreferencesSection } from "@/components/settings/notification-preferences-section";
import { DialectPreferencesSection } from "@/components/settings/dialect-preferences-section";
import { FontPreferencesSection } from "@/components/settings/font-preferences-section";
import { parseReturnTo } from "@/lib/utils/dialect-preferences";
import { useSavePreferences } from "@/components/settings/use-save-preferences";

export function PreferencesScreenDesktop() {
  const searchParams = useSearchParams();
  const { dataset, progress } = useApp();
  const [showKansaiDialect, setShowKansaiDialect] = useState(
    progress.settings.showKansaiDialect ?? false
  );
  const [kansaiAsPrimary, setKansaiAsPrimary] = useState(
    progress.settings.kansaiAsPrimary ?? false
  );
  const [uiFont, setUiFont] = useState<UiFont>(resolveUiFont(progress.settings.uiFont));
  const [notifications, setNotifications] = useState<NotificationPreferences>(
    progress.settings.notifications ?? DEFAULT_NOTIFICATION_PREFERENCES
  );

  useEffect(() => {
    setShowKansaiDialect(progress.settings.showKansaiDialect ?? false);
    setKansaiAsPrimary(progress.settings.kansaiAsPrimary ?? false);
    setUiFont(resolveUiFont(progress.settings.uiFont));
    setNotifications(progress.settings.notifications ?? DEFAULT_NOTIFICATION_PREFERENCES);
  }, [
    progress.settings.showKansaiDialect,
    progress.settings.kansaiAsPrimary,
    progress.settings.uiFont,
    progress.settings.notifications,
  ]);

  useEffect(() => {
    document.documentElement.dataset.uiFont = uiFont;
    return () => {
      document.documentElement.dataset.uiFont = resolveUiFont(progress.settings.uiFont);
    };
  }, [uiFont, progress.settings.uiFont]);

  const returnTo = parseReturnTo(searchParams);
  const { handleSave, saving } = useSavePreferences({
    showKansaiDialect,
    kansaiAsPrimary,
    uiFont,
    notifications,
    returnTo,
  });

  return (
    <DesktopPageShell>
      <DesktopPageHeader
        title="Preferences"
        subtitle="Font, dialect, voice accent, and notifications"
      />

      <FontPreferencesSection uiFont={uiFont} onChange={setUiFont} />

      <DialectPreferencesSection
        showKansaiDialect={showKansaiDialect}
        kansaiAsPrimary={kansaiAsPrimary}
        onShowKansaiChange={setShowKansaiDialect}
        onKansaiPrimaryChange={setKansaiAsPrimary}
      />

      <Card className="mb-6 p-4">
        <Label className="text-base">Notifications</Label>
        <p className="mt-1 mb-4 text-sm text-muted leading-relaxed">
          Daily study nudges, review reminders, and optional per-island alerts.
        </p>
        <NotificationPreferencesSection
          notifications={notifications}
          onChange={setNotifications}
          dataset={dataset}
        />
      </Card>

      <Button className="w-full" onClick={handleSave} loading={saving}>
        Save preferences
      </Button>
    </DesktopPageShell>
  );
}
