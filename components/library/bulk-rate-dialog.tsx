"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/sentence/star-rating";

export function BulkRateDialog({
  open,
  onOpenChange,
  sentenceCount,
  label,
  loading = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sentenceCount: number;
  label?: string;
  loading?: boolean;
  onConfirm: (rating: number) => void | Promise<void>;
}) {
  const [rating, setRating] = useState<number | null>(5);

  const handleConfirm = async () => {
    if (rating === null) return;
    await onConfirm(rating);
    onOpenChange(false);
    setRating(5);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate {sentenceCount} sentence{sentenceCount === 1 ? "" : "s"}</DialogTitle>
          <DialogDescription>
            {label ? (
              <>
                Applies one rating to all sentences in <span className="font-medium">{label}</span>.
              </>
            ) : (
              <>Applies one rating to all selected sentences.</>
            )}{" "}
            Ratings of 4–5 retire sentences from your active batch and schedule review.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-2">
          <StarRating value={rating} onChange={setRating} size="md" />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={rating === null || loading} loading={loading}>
            Apply rating
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
