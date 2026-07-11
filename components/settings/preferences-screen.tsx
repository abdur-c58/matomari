"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DIALECT_OPTIONS } from "@/lib/constants/dialect";
import type { Dialect } from "@/lib/constants/dialect";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "@/lib/constants/notifications";
import { NotificationPreferencesSection } from "@/components/settings/notification-preferences-section";
import { parseReturnTo } from "@/lib/utils/dialect-preferences";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function PreferencesScreen() {
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

      <Card className="mb-6 p-4">
        <Label className="text-base">Japanese dialect</Label>
        <p className="mt-1 text-sm text-muted leading-relaxed">
          Choose how sentences are translated and spoken.
        </p>

        <div className="mt-4 space-y-2">
          {DIALECT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDialect(option.value)}
              className={cn(
                "w-full rounded-xl border p-4 text-left transition-colors",
                dialect === option.value
                  ? "border-foreground bg-foreground/5"
                  : "border-border hover:border-foreground/30"
              )}
            >
              <p className="font-medium text-foreground">{option.label}</p>
              <p className="mt-1 text-sm text-muted">{option.description}</p>
            </button>
          ))}
        </div>
      </Card>

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
