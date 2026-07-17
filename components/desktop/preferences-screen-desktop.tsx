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
import { FontPreferencesSection } from "@/components/settings/font-preferences-section";
import { PreferencesSaveBar } from "@/components/settings/preferences-save-bar";
import { UnsavedPreferencesDialog } from "@/components/settings/unsaved-preferences-dialog";
import { parseReturnTo } from "@/lib/utils/dialect-preferences";
import { useSavePreferences } from "@/components/settings/use-save-preferences";
import { useScrollAtBottom } from "@/hooks/use-scroll-at-bottom";
import { useUnsavedPreferencesGuard } from "@/hooks/use-unsaved-preferences-guard";
import { cn } from "@/lib/utils";

const LEAVE_HREF = "/settings";

export function PreferencesScreenDesktop() {
  const searchParams = useSearchParams();
  const { dataset, progress } = useApp();
  const [uiFont, setUiFont] = useState<UiFont>(resolveUiFont(progress.settings.uiFont));
  const [notifications, setNotifications] = useState<NotificationPreferences>(
    progress.settings.notifications ?? DEFAULT_NOTIFICATION_PREFERENCES
  );

  useEffect(() => {
    setUiFont(resolveUiFont(progress.settings.uiFont));
    setNotifications(progress.settings.notifications ?? DEFAULT_NOTIFICATION_PREFERENCES);
  }, [progress.settings.uiFont, progress.settings.notifications]);

  useEffect(() => {
    document.documentElement.dataset.uiFont = uiFont;
    return () => {
      document.documentElement.dataset.uiFont = resolveUiFont(progress.settings.uiFont);
    };
  }, [uiFont, progress.settings.uiFont]);

  const returnTo = parseReturnTo(searchParams);
  const { handleSave, saving, hasUnsavedChanges } = useSavePreferences({
    showKansaiDialect: false,
    kansaiAsPrimary: false,
    uiFont,
    notifications,
    returnTo,
  });
  const { isAtBottom, sentinelRef } = useScrollAtBottom();
  const {
    dialogOpen,
    pendingHref,
    completeLeave,
    dismissDialog,
    setDialogOpen,
  } = useUnsavedPreferencesGuard({
    enabled: hasUnsavedChanges,
    leaveHref: LEAVE_HREF,
  });

  const floatingSave = !isAtBottom;

  return (
    <>
      <DesktopPageShell
        className={cn(floatingSave && "pb-[calc(5rem+env(safe-area-inset-bottom,0px))]")}
      >
        <DesktopPageHeader
          title="Preferences"
          subtitle="Font and notifications"
        />

        <FontPreferencesSection uiFont={uiFont} onChange={setUiFont} />

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

        <div ref={sentinelRef} className="h-px" aria-hidden />

        {isAtBottom && (
          <Button className="w-full max-w-md" onClick={() => handleSave()} loading={saving}>
            Save preferences
          </Button>
        )}
      </DesktopPageShell>

      <PreferencesSaveBar
        visible={floatingSave}
        onSave={() => handleSave()}
        saving={saving}
        hasUnsavedChanges={hasUnsavedChanges}
      />

      <UnsavedPreferencesDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) dismissDialog();
          else setDialogOpen(true);
        }}
        saving={saving}
        onDiscard={() => completeLeave(pendingHref ?? LEAVE_HREF)}
        onSaveAndExit={() => handleSave(pendingHref ?? returnTo)}
      />
    </>
  );
}
