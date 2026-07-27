"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function SceneSwitchDialog({
  open,
  fromLabel,
  toLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  fromLabel: string;
  toLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [displayFrom, setDisplayFrom] = useState(fromLabel);
  const [displayTo, setDisplayTo] = useState(toLabel);

  useEffect(() => {
    if (!open) return;
    if (fromLabel) setDisplayFrom(fromLabel);
    if (toLabel) setDisplayTo(toLabel);
  }, [open, fromLabel, toLabel]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="max-w-md overflow-hidden">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>Switch study focus?</DialogTitle>
          <DialogDescription className="text-pretty break-words">
            Daily progress tracking will switch from{" "}
            <span className="font-medium text-foreground">{displayFrom}</span> to{" "}
            <span className="font-medium text-foreground">{displayTo}</span>. Your
            progress on {displayFrom} is saved — you can resume later with a quick
            review.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-w-0 flex-col gap-2">
          <Button
            className="h-auto w-full whitespace-normal px-4 py-2.5 text-center leading-snug"
            onClick={onConfirm}
          >
            Switch to {displayTo}
          </Button>
          <Button
            variant="secondary"
            className="h-auto w-full whitespace-normal px-4 py-2.5 text-center leading-snug"
            onClick={onCancel}
          >
            Stay on {displayFrom}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
