"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
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
import { toast } from "sonner";

export function PreferencesScreenMobile() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dataset, progress, setProgress, refresh } = useApp();
  const [dialect, setDialect] = useState<Dialect>(progress.settings.dialect);
  const [notifications, setNotifications] = useState<NotificationPreferences>(
    progress.settings.notifications ?? DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDialect(progress.settings.dialect);
    setNotifications(progress.settings.notifications ?? DEFAULT_NOTIFICATION_PREFERENCES);
  }, [progress.settings.dialect, progress.settings.notifications]);

  const returnTo = parseReturnTo(searchParams);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await setProgress({
        ...progress,
        settings: {
          ...progress.settings,
          dialect,
          dialectChosen: true,
          notifications,
        },
      });
      await refresh();
      toast.success("Preferences saved");
      router.push(returnTo);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save preferences");
    } finally {
      setSaving(false);
    }
  }, [dialect, notifications, progress, returnTo, router, setProgress, refresh]);

  return (
    <PageShell>
      <PageHeader title="Preferences" backHref="/settings" />

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
    </PageShell>
  );
}
