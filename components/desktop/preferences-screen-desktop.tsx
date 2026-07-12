"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { DesktopPageShell } from "@/components/layout/desktop-page-shell";
import { DesktopPageHeader } from "@/components/layout/desktop-page-header";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Dialect } from "@/lib/constants/dialect";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "@/lib/constants/notifications";
import { NotificationPreferencesSection } from "@/components/settings/notification-preferences-section";
import { DialectPreferencesSection } from "@/components/settings/dialect-preferences-section";
import { parseReturnTo } from "@/lib/utils/dialect-preferences";
import { useSavePreferences } from "@/components/settings/use-save-preferences";

export function PreferencesScreenDesktop() {
  const searchParams = useSearchParams();
  const { dataset, progress } = useApp();
  const [dialect, setDialect] = useState<Dialect>(progress.settings.dialect);
  const [notifications, setNotifications] = useState<NotificationPreferences>(
    progress.settings.notifications ?? DEFAULT_NOTIFICATION_PREFERENCES
  );

  useEffect(() => {
    setDialect(progress.settings.dialect);
    setNotifications(progress.settings.notifications ?? DEFAULT_NOTIFICATION_PREFERENCES);
  }, [progress.settings.dialect, progress.settings.notifications]);

  const returnTo = parseReturnTo(searchParams);
  const { handleSave, saving, confirmDialog } = useSavePreferences({
    dialect,
    notifications,
    returnTo,
  });

  return (
    <DesktopPageShell>
      <DesktopPageHeader
        title="Preferences"
        subtitle="Dialect, voice accent, and notifications"
      />

      <DialectPreferencesSection dialect={dialect} onChange={setDialect} />

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
      {confirmDialog}
    </DesktopPageShell>
  );
}
