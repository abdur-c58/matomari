"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, HardDrive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  cancelDownload,
  downloadAllPackages,
  downloadIslandPackage,
  formatBytes,
  getOfflineInventory,
  isIslandDownloaded,
  onDownloadProgress,
  removeAllPackages,
  removeIslandPackage,
} from "@/lib/offline/audio-packages";
import type { Dialect } from "@/lib/constants/dialect";
import type { DownloadProgress } from "@/types/offline-audio";

export function IslandOfflineControls({
  islandKey,
  label,
  sentenceIds,
  dialect,
}: {
  islandKey: string;
  label: string;
  sentenceIds: string[];
  dialect: Dialect;
}) {
  const [downloaded, setDownloaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  const refresh = useCallback(async () => {
    setDownloaded(await isIslandDownloaded(islandKey));
  }, [islandKey]);

  useEffect(() => {
    void refresh();
    return onDownloadProgress((p) => {
      setProgress(p?.packageId === islandKey ? p : p);
      if (!p) void refresh();
    });
  }, [islandKey, refresh]);

  const handleDownload = async () => {
    setBusy(true);
    try {
      const record = await downloadIslandPackage({
        islandKey,
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
      await removeIslandPackage(islandKey);
      toast.success("Removed offline audio for this island");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  };

  const active =
    progress?.active &&
    (progress.packageId === islandKey || progress.packageId === "__all__");

  return (
    <div className="flex flex-wrap items-center gap-2">
      {downloaded ? (
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
          onClick={() => cancelDownload(islandKey)}
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
