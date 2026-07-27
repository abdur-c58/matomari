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
import type { ChangePlanPreview } from "@/lib/services/billing/types";

export function PlanChangeConfirmDialog({
  open,
  preview,
  loading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  preview: ChangePlanPreview | null;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);

  const planLabel = preview?.plan === "pro" ? "Pro" : "Plus";
  const isUpgrade = preview?.plan === "pro";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setAcknowledged(false);
          onCancel();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isUpgrade ? "Upgrade to Pro" : "Switch to Plus"}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-left text-sm text-muted">
              {preview ? (
                <>
                  <p>
                    Your billing interval stays{" "}
                    <strong className="text-foreground">
                      {preview.interval === "annual" ? "annual" : "monthly"}
                    </strong>
                    . Paddle will apply proration immediately.
                  </p>
                  <ul className="space-y-1 rounded-lg border border-border bg-surface-raised p-3 text-foreground">
                    {Number(preview.creditAmount) > 0 && (
                      <li>Credit today: {preview.creditLabel}</li>
                    )}
                    {Number(preview.chargeAmount) > 0 && (
                      <li>Charge today: {preview.chargeLabel}</li>
                    )}
                    <li className="font-semibold">
                      Net today: {preview.netLabel}
                    </li>
                  </ul>
                  {preview.interval === "annual" && Number(preview.chargeAmount) > 500 && (
                    <p className="text-xs text-destructive">
                      Annual upgrades can charge a larger prorated amount mid-cycle.
                      Confirm only if you intend to pay {preview.netLabel} today.
                    </p>
                  )}
                  <label className="flex items-start gap-2 text-xs text-foreground">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                    />
                    I understand I will be charged or credited {preview.netLabel}{" "}
                    today and my plan becomes {planLabel} immediately.
                  </label>
                </>
              ) : (
                <p>Loading proration preview…</p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            loading={loading}
            disabled={!preview || !acknowledged}
            onClick={onConfirm}
          >
            Confirm change
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
