"use client";

import { useState } from "react";
import { CopyPlus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { Button } from "@/components/ui/button";
import { getAllSentences } from "@/lib/validation/dataset-schema";
import type { Island } from "@/types/sentence";

export function IslandCloneButton({ shareId }: { shareId: string }) {
  const { dataset, addIsland, mergeDialectTranslations } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClone = async () => {
    if (!dataset) return;
    setLoading(true);
    try {
      const res = await fetch("/api/islands/shared", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clone",
          shareId,
          existingIslandKeys: Object.keys(dataset.islands),
          existingSentenceIds: [...getAllSentences(dataset).keys()],
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Clone failed");

      await addIsland(body.islandKey as string, body.island as Island);
      if (body.translations) {
        await mergeDialectTranslations(body.translations);
      }

      toast.success("Cloned island — you can edit this copy freely");
      router.push(`/batch/island/${encodeURIComponent(body.islandKey)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clone failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-full"
      loading={loading}
      onClick={() => void handleClone()}
    >
      <CopyPlus className="mr-1.5 h-3.5 w-3.5" />
      Clone
    </Button>
  );
}
