"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Link2, RefreshCw, Unlink } from "lucide-react";
import { toast } from "sonner";
import type { Island } from "@/types/sentence";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function IslandShareControls({
  islandKey,
  island,
  onIslandUpdated,
}: {
  islandKey: string;
  island: Island;
  onIslandUpdated?: (next: Island) => void;
}) {
  const [open, setOpen] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!island.id) return;
    try {
      const res = await fetch(
        `/api/islands/share?sourceIslandId=${encodeURIComponent(island.id)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = (await res.json()) as { shareId: string | null; active: boolean };
      setShareId(data.shareId);
      setActive(data.active);
    } catch {
      // ignore
    }
  }, [island.id]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void refreshStatus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, refreshStatus]);

  const createOrCopy = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/islands/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ islandKey, island }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to create share link");

      if (body.island) onIslandUpdated?.(body.island as Island);
      setShareId(body.shareId);
      setActive(true);
      setUrl(body.url);
      await navigator.clipboard.writeText(body.url);
      toast.success("Share link copied to clipboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to share");
    } finally {
      setLoading(false);
    }
  };

  const regenerate = async () => {
    if (!shareId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/islands/share", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareId, action: "regenerate" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to regenerate");
      setActive(true);
      setUrl(body.url);
      await navigator.clipboard.writeText(body.url);
      toast.success("New link copied — old link no longer works");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to regenerate");
    } finally {
      setLoading(false);
    }
  };

  const revoke = async () => {
    if (!shareId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/islands/share", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareId, action: "revoke" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to revoke");
      setActive(false);
      setUrl(null);
      toast.success("Share link revoked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to revoke");
    } finally {
      setLoading(false);
    }
  };

  if (island.readOnly || island.provenance?.kind === "shared") {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full">
          <Link2 className="mr-1.5 h-3.5 w-3.5" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share island</DialogTitle>
          <DialogDescription>
            Anyone signed in with the link can preview and import a live read-only copy.
            Regenerating replaces the link; existing copies stay in libraries.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {url && active && (
            <p className="break-all rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-muted">
              {url}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button loading={loading} onClick={() => void createOrCopy()}>
              <Copy className="mr-2 h-4 w-4" />
              {active ? "Copy share link" : "Create & copy link"}
            </Button>
            {shareId && active && (
              <>
                <Button
                  variant="secondary"
                  loading={loading}
                  onClick={() => void regenerate()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate link
                </Button>
                <Button variant="outline" loading={loading} onClick={() => void revoke()}>
                  <Unlink className="mr-2 h-4 w-4" />
                  Revoke link
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
