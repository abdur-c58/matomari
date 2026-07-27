"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, HardDrive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  cancelDownload,
  downloadAllPackages,
  downloadScenePackage,
  formatBytes,
  getOfflineInventory,
  isSceneDownloaded,
  isSceneDownloadStale,
  onDownloadProgress,
  removeAllPackages,
  removeScenePackage,
} from "@/lib/offline/audio-packages";
import type { Dialect } from "@/lib/constants/dialect";
import type { DownloadProgress } from "@/types/offline-audio";
import { useSceneAccess } from "@/hooks/use-scene-access";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";

export function SceneOfflineControls({
  sceneKey,
  label,
  sentenceIds,
  dialect,
}: {
  sceneKey: string;
  label: string;
  sentenceIds: string[];
  dialect: Dialect;
}) {
  const { allowsOfflinePackages, loaded } = useSceneAccess();
  const [downloaded, setDownloaded] = useState(false);
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  const refresh = useCallback(async () => {
    const hasDownload = await isSceneDownloaded(sceneKey);
    setDownloaded(hasDownload);
    if (hasDownload) {
      setStale(await isSceneDownloadStale(sceneKey, sentenceIds, dialect));
    } else {
      setStale(false);
    }
  }, [sceneKey, sentenceIds, dialect]);

  useEffect(() => {
    void refresh();
    return onDownloadProgress((p) => {
      setProgress(p?.packageId === sceneKey ? p : p);
      if (!p) void refresh();
    });
  }, [sceneKey, refresh]);

  if (loaded && !allowsOfflinePackages) {
    return (
      <UpgradePrompt
        className="w-full"
        title="Offline packages are on Plus"
        description="Download ready audio for offline study when you upgrade to Plus or Pro."
        href="/billing/checkout?plan=plus"
        ctaLabel="Upgrade to Plus"
      />
    );
  }

  const handleDownload = async () => {
    setBusy(true);
    try {
      const record = await downloadScenePackage({
        sceneKey,
        label,
        sentenceIds,
        dialect,
      });
      if (record.status === "ready") {
        toast.success(
          `Downloaded ${record.textHashes.length} tracks (${formatBytes(record.totalBytes)})`
        );
      } else {
        toast.warning(record.lastError ?? "Nothing ready to download yet");
      }
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await removeScenePackage(sceneKey);
      toast.success("Removed offline audio for this scene");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  };

  const active =
    progress?.active &&
    (progress.packageId === sceneKey || progress.packageId === "__all__");

  return (
    <div className="flex flex-wrap items-center gap-2">
      {downloaded ? (
        <>
          {stale && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="rounded-full"
              disabled={busy}
              onClick={handleDownload}
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              Update download
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={busy}
            onClick={handleRemove}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Remove download
          </Button>
        </>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="rounded-full"
          disabled={busy || sentenceIds.length === 0}
          onClick={handleDownload}
        >
          <Download className="mr-1 h-3.5 w-3.5" />
          {active
            ? `Downloading ${progress?.completed ?? 0}/${progress?.total ?? 0}`
            : "Download for offline"}
        </Button>
      )}
      {active && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => cancelDownload(sceneKey)}
        >
          Cancel
        </Button>
      )}
    </div>
  );
}

export function SettingsOfflineAudioCard({
  sentenceIds,
  dialect,
}: {
  sentenceIds: string[];
  dialect: Dialect;
}) {
  const { allowsOfflinePackages, loaded } = useSceneAccess();
  const [totalBytes, setTotalBytes] = useState(0);
  const [packageCount, setPackageCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  const refresh = useCallback(async () => {
    const inv = await getOfflineInventory();
    setTotalBytes(inv.totalBytes);
    setPackageCount(inv.packages.length);
  }, []);

  useEffect(() => {
    void refresh();
    return onDownloadProgress((p) => {
      setProgress(p);
      if (!p) void refresh();
    });
  }, [refresh]);

  if (loaded && !allowsOfflinePackages) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <HardDrive className="h-5 w-5 shrink-0 text-foreground" />
          <div>
            <p className="font-medium">Offline audio</p>
            <p className="text-sm text-muted">
              Package ready audio for offline study on Plus or Pro.
            </p>
          </div>
        </div>
        <UpgradePrompt
          title="Unlock offline packages"
          description="Plus and Pro can download scene audio for offline listening."
          href="/billing/checkout?plan=plus"
          ctaLabel="Upgrade to Plus"
        />
      </div>
    );
  }

  const handleDownloadAll = async () => {
    setBusy(true);
    try {
      const record = await downloadAllPackages({
        sentenceIds,
        dialect,
        label: "All translated audio",
      });
      if (record.status === "ready") {
        toast.success(
          `Downloaded ${record.textHashes.length} tracks (${formatBytes(record.totalBytes)})`
        );
      } else {
        toast.warning(record.lastError ?? "No ready audio yet");
      }
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    setBusy(true);
    try {
      await removeAllPackages();
      toast.success("Cleared downloaded audio");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clear failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <HardDrive className="h-5 w-5 shrink-0 text-foreground" />
        <div>
          <p className="font-medium">Offline audio</p>
          <p className="text-sm text-muted">
            {packageCount > 0
              ? `${packageCount} package(s), ${formatBytes(totalBytes)} on this device`
              : "Stream online by default. Download only what you need for offline."}
          </p>
        </div>
      </div>
      {progress?.active && (
        <p className="text-xs text-muted">
          {progress.label}: {progress.completed}/{progress.total}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="w-full"
          variant="secondary"
          disabled={busy || sentenceIds.length === 0}
          onClick={handleDownloadAll}
        >
          <Download className="mr-1 h-4 w-4" />
          Download all ready audio
        </Button>
        <Button
          className="w-full"
          variant="outline"
          disabled={busy || packageCount === 0}
          onClick={handleClear}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Clear downloads
        </Button>
      </div>
    </div>
  );
}
