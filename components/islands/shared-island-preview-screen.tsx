"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Copy, Library, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { AppGate, EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SharedIslandPreview } from "@/lib/services/island-sharing-service";

export function SharedIslandPreviewScreen() {
  const params = useParams();
  const router = useRouter();
  const token = decodeURIComponent(String(params.shareToken ?? ""));
  const [preview, setPreview] = useState<SharedIslandPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/islands/shared/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Share link not found");
        }
        const data = (await res.json()) as SharedIslandPreview;
        if (!cancelled) setPreview(data);
      } catch (e) {
        if (!cancelled) {
          setPreview(null);
          setError(e instanceof Error ? e.message : "Failed to load share");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAdd = async () => {
    setAdding(true);
    try {
      const res = await fetch("/api/islands/shared", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", token }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to add island");
      toast.success("Island added to your library");
      router.push(`/batch/island/${encodeURIComponent(body.libraryKey)}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add island");
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <AppGate>
        <PageShell className="md:max-w-xl">
          <div className="flex items-center justify-center gap-2 py-16 text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading shared island…
          </div>
        </PageShell>
      </AppGate>
    );
  }

  if (error || !preview) {
    return (
      <AppGate>
        <PageShell className="md:max-w-xl">
          <EmptyState
            title="Share link unavailable"
            description={error ?? "This share link is invalid or has been revoked."}
            actionHref="/batch"
            actionLabel="Back to Islands"
          />
        </PageShell>
      </AppGate>
    );
  }

  return (
    <AppGate>
      <PageShell className="md:max-w-xl">
        <div className="rounded-2xl border border-border/70 bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold text-foreground">
              {preview.title}
            </h1>
            {preview.format === "narration" && (
              <Badge className="border-transparent bg-violet-950/30 text-violet-100">
                Narration
              </Badge>
            )}
            <Badge variant="secondary">Read-only preview</Badge>
          </div>
          <p className="mt-2 text-sm text-muted">{preview.description}</p>
          <p className="mt-3 text-xs text-muted">
            {preview.sentenceCount} sentences
            {preview.createdByLabel ? ` · ${preview.createdByLabel}` : ""}
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            {preview.isOwner ? (
              <Button className="flex-1" onClick={() => router.push("/batch")}>
                This is your island
              </Button>
            ) : preview.alreadyMember ? (
              <Button
                className="flex-1"
                onClick={() =>
                  router.push(
                    `/batch/island/${encodeURIComponent(`shared:${preview.shareId}`)}`
                  )
                }
              >
                <Library className="mr-2 h-4 w-4" />
                Open in library
              </Button>
            ) : (
              <Button className="flex-1" loading={adding} onClick={() => void handleAdd()}>
                <Copy className="mr-2 h-4 w-4" />
                Import to my library
              </Button>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">
            Import keeps a live read-only copy. Clone it later if you want to edit.
          </p>
        </div>
      </PageShell>
    </AppGate>
  );
}
