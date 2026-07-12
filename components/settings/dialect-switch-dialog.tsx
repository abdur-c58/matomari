"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Dialect } from "@/lib/constants/dialect";
import { getDialectLabel } from "@/lib/constants/dialect";

export function DialectSwitchDialog({
  open,
  onOpenChange,
  fromDialect,
  toDialect,
  onConfirm,
  loading = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromDialect: Dialect;
  toDialect: Dialect;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom)))]">
        <DialogHeader>
          <DialogTitle>Switch dialect?</DialogTitle>
          <DialogDescription className="text-left leading-relaxed">
            Progress and ratings are tracked separately for each dialect. Your{" "}
            <span className="font-medium text-foreground">{getDialectLabel(fromDialect)}</span>{" "}
            progress will be saved. You&apos;ll see your{" "}
            <span className="font-medium text-foreground">{getDialectLabel(toDialect)}</span>{" "}
            progress and ratings instead. Switch back anytime to restore your saved progress.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={loading}>
            Switch dialect
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
