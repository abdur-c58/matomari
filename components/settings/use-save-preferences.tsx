"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import type { Dialect } from "@/lib/constants/dialect";
import type { NotificationPreferences } from "@/lib/constants/notifications";
import { DialectSwitchDialog } from "@/components/settings/dialect-switch-dialog";
import { toast } from "sonner";

export function useSavePreferences({
  dialect,
  notifications,
  returnTo,
}: {
  dialect: Dialect;
  notifications: NotificationPreferences;
  returnTo: string;
}) {
  const router = useRouter();
  const { progress, setProgress, refresh } = useApp();
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const persistPreferences = useCallback(async () => {
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
      setConfirmOpen(false);
    }
  }, [dialect, notifications, progress, returnTo, router, setProgress, refresh]);

  const handleSave = useCallback(() => {
    if (dialect !== progress.settings.dialect) {
      setConfirmOpen(true);
      return;
    }
    void persistPreferences();
  }, [dialect, persistPreferences, progress.settings.dialect]);

  const confirmDialog = (
    <DialectSwitchDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      fromDialect={progress.settings.dialect}
      toDialect={dialect}
      onConfirm={() => void persistPreferences()}
      loading={saving}
    />
  );

  return { handleSave, saving, confirmDialog };
}
