"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function IslandSwitchDialog({
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
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Switch study focus?</DialogTitle>
          <DialogDescription>
            Daily progress tracking will switch from{" "}
            <span className="font-medium text-foreground">{fromLabel}</span> to{" "}
            <span className="font-medium text-foreground">{toLabel}</span>.
            Your progress on {fromLabel} is saved — you can resume later with a
            quick review.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel}>
            Stay on {fromLabel}
          </Button>
          <Button onClick={onConfirm}>Switch to {toLabel}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
