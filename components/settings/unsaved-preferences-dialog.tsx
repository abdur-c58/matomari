"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function UnsavedPreferencesDialog({
  open,
  onOpenChange,
  saving,
  onSaveAndExit,
  onDiscard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  onSaveAndExit: () => void;
  onDiscard: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save preferences?</DialogTitle>
          <DialogDescription>
            You have unsaved changes. Save before leaving, or discard them.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onDiscard} disabled={saving}>
            Discard changes
          </Button>
          <Button onClick={onSaveAndExit} loading={saving}>
            Save and exit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
