"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Upload, Cloud, BookOpen, RefreshCw, SlidersHorizontal } from "lucide-react";
import { useSession } from "next-auth/react";
import { useApp } from "@/components/providers/app-provider";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SyncIndicator } from "@/components/ui/sync-indicator";
import { AccountCard } from "@/components/auth/account-card";
import { AskButton } from "@/components/ai/ask-button";
import { exportDataset } from "@/lib/db/dataset-repository";
import { fetchCloudSession } from "@/lib/sync/cloud-api";
import type { ManualSyncResult } from "@/lib/sync/sync-service";
import {
  MIN_BATCH_SIZE,
  MAX_BATCH_SIZE,
} from "@/lib/constants/study";
import {
  APP_NAME,
  EXPORT_FILENAME,
} from "@/lib/constants/branding";
import { getDialectLabel } from "@/lib/constants/dialect";
import { summarizeNotificationPreferences } from "@/lib/notifications/notification-summary";
import { toast } from "sonner";

function formatManualSyncToast(result: ManualSyncResult) {
  if (!result.supabaseOk) {
    return result.message ?? "Cloud sync failed";
  }

  const parts = ["Synced library, progress, and stats"];
  if (result.audio.total > 0) {
    parts.push(
      `Audio: ${result.audio.uploaded} uploaded, ${result.audio.skipped} already cached`
    );
    if (result.audio.quotaExceeded) {
      parts.push("ElevenLabs quota reached — tap Sync again later for remaining audio");
    } else if (result.audio.failed > 0) {
      parts.push(`${result.audio.failed} audio files failed`);
    }
  }
  return parts.join(". ");
}

export function SettingsScreen() {
  const { data: session } = useSession();
  const {
    progress,
    setProgress,
    syncStatus,
    syncStatusMessage,
    lastSyncedAt,
    manualSync,
  } = useApp();
  const [cloudReady, setCloudReady] = useState<boolean | null>(null);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const batchSize = progress.settings.batchSize;

  useEffect(() => {
    void fetchCloudSession().then((cloud) => {
      setCloudReady(cloud.tablesReady !== false);
      setTablesError(cloud.tablesError ?? null);
    });
  }, [session?.user?.email, syncStatus, lastSyncedAt]);

  const handleExport = async () => {
    const data = await exportDataset();
    if (!data) {
      toast.error("No dataset to export");
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = EXPORT_FILENAME;
    a.click();
    toast.success("Dataset exported");
  };

  const handleManualSync = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await manualSync();
      const message = formatManualSyncToast(result);
      if (result.supabaseOk) {
        if (result.ok) {
          toast.success(message);
        } else {
          toast.warning(message);
        }
      } else {
        toast.error(message);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [manualSync]);

  const isAuthenticated = Boolean(session?.user);
  const syncDisabled =
    syncing ||
    syncStatus === "syncing" ||
    !isAuthenticated ||
    cloudReady === false;

  return (
    <PageShell>
      <PageHeader title="Settings" backHref="/" />

      <AccountCard />

      <Card className="mb-6 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-5 w-5 shrink-0 text-foreground" />
            <div>
              <p className="font-medium">Preferences</p>
              <p className="text-sm text-muted">
                {progress.settings.dialectChosen
                  ? `${getDialectLabel(progress.settings.dialect)} dialect`
                  : "Choose a Japanese dialect before translating"}
                {" · "}
                {summarizeNotificationPreferences(progress.settings.notifications)}
              </p>
            </div>
          </div>
        </div>
        <Button className="mt-4 w-full" variant="secondary" asChild>
          <Link href="/settings/preferences">Open preferences</Link>
        </Button>
      </Card>

      <Card className="mb-6 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Cloud className="h-5 w-5 shrink-0 text-foreground" />
            <div>
              <p className="font-medium">Cloud sync</p>
              <p className="text-sm text-muted">
                {syncStatusMessage ??
                  tablesError ??
                  (lastSyncedAt
                    ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}`
                    : "Not synced yet")}
              </p>
            </div>
          </div>
          <SyncIndicator status={syncStatus} />
        </div>
        <Button
          className="mt-4 w-full"
          variant="secondary"
          disabled={syncDisabled}
          onClick={handleManualSync}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${syncing || syncStatus === "syncing" ? "animate-spin" : ""}`}
          />
          {syncing || syncStatus === "syncing" ? "Syncing…" : "Sync now"}
        </Button>
        {!isAuthenticated && (
          <p className="mt-2 text-xs text-muted">Sign in with Google to enable cloud sync.</p>
        )}
        {isAuthenticated && tablesError && (
          <p className="mt-2 text-xs text-muted">{tablesError}</p>
        )}
      </Card>

      <section className="mb-6">
        <Label>Default batch size: {batchSize}</Label>
        <Slider
          className="mt-3"
          min={MIN_BATCH_SIZE}
          max={MAX_BATCH_SIZE}
          step={1}
          value={[batchSize]}
          onValueChange={async ([v]) => {
            await setProgress({
              ...progress,
              settings: { ...progress.settings, batchSize: v },
            });
          }}
        />
      </section>

      <Separator className="my-6" />

      <section className="mb-6 space-y-3">
        <p className="text-sm font-medium text-muted">Help</p>
        <AskButton
          context={{ type: "general" }}
          label="AI Tutor"
          variant="secondary"
          className="w-full justify-start"
        />
        <Button variant="secondary" className="w-full justify-start" asChild>
          <Link href="/guide">
            <BookOpen className="mr-2 h-5 w-5" /> How to use {APP_NAME}
          </Link>
        </Button>
      </section>

      <Separator className="my-6" />

      <section className="space-y-3">
        <p className="text-sm font-medium text-muted">Data</p>
        <Button variant="secondary" className="w-full" asChild>
          <Link href="/import">
            <Upload className="mr-2 h-5 w-5" /> Import dataset
          </Link>
        </Button>
        <Button variant="secondary" className="w-full" onClick={handleExport}>
          <Download className="mr-2 h-5 w-5" /> Export dataset
        </Button>
      </section>
    </PageShell>
  );
}
