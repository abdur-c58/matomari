"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import type { NotificationPreferences } from "@/lib/constants/notifications";
import type { UiFont } from "@/lib/constants/ui-font";
import { resolveUiFont } from "@/lib/constants/ui-font";
import { resolveTranslationSettings } from "@/lib/preferences/translation-preferences";
import { toast } from "sonner";

export function useSavePreferences({
  showKansaiDialect,
  kansaiAsPrimary,
  notifications,
  uiFont,
  returnTo,
}: {
  showKansaiDialect: boolean;
  kansaiAsPrimary: boolean;
  notifications: NotificationPreferences;
  uiFont: UiFont;
  returnTo: string;
}) {
  const router = useRouter();
  const { progress, setProgress, refresh } = useApp();
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const merged = {
        ...progress.settings,
        showKansaiDialect,
        kansaiAsPrimary: showKansaiDialect ? kansaiAsPrimary : false,
        notifications,
        uiFont: resolveUiFont(uiFont),
      };
      const resolved = resolveTranslationSettings(merged);

      await setProgress({
        ...progress,
        settings: {
          ...merged,
          ...resolved,
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
  }, [
    showKansaiDialect,
    kansaiAsPrimary,
    notifications,
    uiFont,
    progress,
    returnTo,
    router,
    setProgress,
    refresh,
  ]);

  return { handleSave, saving };
}
