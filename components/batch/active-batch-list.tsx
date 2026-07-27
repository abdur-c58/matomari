"use client";

import { useCallback, useState } from "react";
import type { Sentence } from "@/types/sentence";
import { useApp } from "@/components/providers/app-provider";
import { SentenceCard } from "@/components/sentence/sentence-card";
import { BulkRateDialog } from "@/components/library/bulk-rate-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/empty-state";
import { bulkApplySentenceRatings } from "@/lib/services/bulk-rating-service";
import { suggestRating } from "@/lib/services/rating-service";
import { toast } from "sonner";

export function ActiveBatchList({ sentences }: { sentences: Sentence[] }) {
  const { dataset, progress, setProgress } = useApp();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleRate = useCallback(
    async (sentenceId: string, rating: number) => {
      if (!dataset) return;
      const result = bulkApplySentenceRatings(dataset, progress, [sentenceId], rating);
      await setProgress(result.progress);
      toast.success(`Rated ${rating} star${rating === 1 ? "" : "s"}`);
    },
    [dataset, progress, setProgress]
  );

  const handleRateAll = useCallback(
    async (rating: number) => {
      if (!dataset || sentences.length === 0) return;
      setBulkLoading(true);
      try {
        const ids = sentences.map((s) => s.id);
        const result = bulkApplySentenceRatings(dataset, progress, ids, rating);
        await setProgress(result.progress);
        toast.success(
          `Rated ${result.updatedCount} sentence${result.updatedCount === 1 ? "" : "s"}`
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not apply rating");
      } finally {
        setBulkLoading(false);
      }
    },
    [dataset, progress, sentences, setProgress]
  );

  if (sentences.length === 0) {
    return (
      <EmptyState
        title="Nothing active yet"
        description="Pick a pathway batch or scene above to start studying."
      />
    );
  }

  const confirmed = sentences.filter(
    (s) => progress.sentences[s.id]?.meaningConfirmed
  ).length;

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Active sentences</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">{sentences.length} active</Badge>
          <Badge variant="success">{confirmed} confirmed</Badge>
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
            Rate all
          </Button>
        </div>
      </div>

      {sentences.map((s) => {
        const sp = progress.sentences[s.id];
        return (
          <SentenceCard
            key={s.id}
            sentence={s}
            progress={sp}
            variant="compact"
            onRate={(rating) => handleRate(s.id, rating)}
            suggestedRating={sp ? suggestRating(sp) : null}
          />
        );
      })}

      <BulkRateDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        sentenceCount={sentences.length}
        label="active batch"
        loading={bulkLoading}
        onConfirm={handleRateAll}
      />
    </div>
  );
}
