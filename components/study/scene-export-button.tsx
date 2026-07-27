"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { useSceneAccess } from "@/hooks/use-scene-access";
import type { Dialect } from "@/lib/constants/dialect";
import { toast } from "sonner";

export function SceneExportButton({
  sceneKey,
  dialect,
}: {
  sceneKey: string;
  dialect: Dialect;
}) {
  const { allowsSceneExport, loaded } = useSceneAccess();
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "working" | "ready">("idle");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  if (loaded && !allowsSceneExport) {
    return (
      <UpgradePrompt
        title="Export is a Pro feature"
        description="Download a branded PDF plus numbered audio files for offline study."
        href="/billing/checkout?plan=pro"
        ctaLabel="Upgrade to Pro"
      />
    );
  }

  async function runExport() {
    setBusy(true);
    setPhase("working");
    setDownloadUrl(null);
    try {
      const res = await fetch(`/api/scenes/${encodeURIComponent(sceneKey)}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dialect }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Export failed");
      if (data.downloadUrl) {
        setDownloadUrl(data.downloadUrl as string);
        setPhase("ready");
        toast.success("Export ready");
      } else if (data.job?.id) {
        // Poll briefly if async
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          const poll = await fetch(
            `/api/scenes/${encodeURIComponent(sceneKey)}/export/${data.job.id}`
          );
          const json = await poll.json();
          if (json.downloadUrl) {
            setDownloadUrl(json.downloadUrl as string);
            setPhase("ready");
            toast.success("Export ready");
            return;
          }
          if (json.job?.status === "failed") {
            throw new Error(json.job.errorMessage ?? "Export failed");
          }
        }
        throw new Error("Export is taking longer than expected — try again shortly.");
      } else {
        throw new Error("Export produced no download");
      }
    } catch (err) {
      setPhase("idle");
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="rounded-full"
          disabled={busy}
          onClick={() => void runExport()}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          {phase === "working" ? "Preparing export…" : "Export PDF + audio"}
        </Button>
        {phase === "ready" && downloadUrl && (
          <Button type="button" size="sm" className="rounded-full" asChild>
            <a href={downloadUrl} download>
              Download zip
            </a>
          </Button>
        )}
      </div>
      {phase === "working" && (
        <motion.div
          className="h-1.5 overflow-hidden rounded-full bg-surface-raised"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="h-full rounded-full bg-[color:var(--mode-listen)]"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              repeat: Infinity,
              duration: 1.2,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{ width: "40%" }}
          />
        </motion.div>
      )}
    </div>
  );
}
