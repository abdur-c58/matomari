"use client";

import type { Dialect } from "@/lib/constants/dialect";
import { getDialectLabel } from "@/lib/constants/dialect";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function PlaylistDialectDialog({
  open,
  sentenceCount,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  sentenceCount: number;
  onOpenChange: (open: boolean) => void;
  onSelect: (dialect: Dialect) => void;
}) {
  const countLabel = `${sentenceCount} sentence${sentenceCount === 1 ? "" : "s"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Choose playback dialect</DialogTitle>
          <DialogDescription>
            Play {countLabel} in Standard Japanese or Kansai dialect?
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            className="justify-start"
            onClick={() => onSelect("standard")}
          >
            {getDialectLabel("standard")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="justify-start"
            onClick={() => onSelect("kansai")}
          >
            {getDialectLabel("kansai")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
