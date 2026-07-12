"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Dialect } from "@/lib/constants/dialect";
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

export function PreferencesScreenMobile() {
  const searchParams = useSearchParams();
  const { dataset, progress } = useApp();
  const [dialect, setDialect] = useState<Dialect>(progress.settings.dialect);
  const [uiFont, setUiFont] = useState<UiFont>(resolveUiFont(progress.settings.uiFont));
  const [notifications, setNotifications] = useState<NotificationPreferences>(
    progress.settings.notifications ?? DEFAULT_NOTIFICATION_PREFERENCES
  );

  useEffect(() => {
    setDialect(progress.settings.dialect);
    setUiFont(resolveUiFont(progress.settings.uiFont));
    setNotifications(progress.settings.notifications ?? DEFAULT_NOTIFICATION_PREFERENCES);
  }, [progress.settings.dialect, progress.settings.uiFont, progress.settings.notifications]);

  useEffect(() => {
    document.documentElement.dataset.uiFont = uiFont;
    return () => {
      document.documentElement.dataset.uiFont = resolveUiFont(progress.settings.uiFont);
    };
  }, [uiFont, progress.settings.uiFont]);

  const returnTo = parseReturnTo(searchParams);
  const { handleSave, saving, confirmDialog } = useSavePreferences({
    dialect,
    uiFont,
    notifications,
    returnTo,
  });

  return (
    <>
      <PageShell className="pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
        <PageHeader title="Preferences" backHref="/settings" />

        <FontPreferencesSection uiFont={uiFont} onChange={setUiFont} />

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
      </PageShell>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
        <div className="mx-auto max-w-lg">
          <Button className="w-full" onClick={handleSave} loading={saving}>
            Save preferences
          </Button>
        </div>
      </div>

      {confirmDialog}
    </>
  );
}
