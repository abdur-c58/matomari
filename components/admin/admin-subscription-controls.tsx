"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { BILLING_STATUS, type AdminUserDetail } from "@/lib/admin/types";
import type { AdminGrantDuration } from "@/lib/services/billing/admin-subscription";

type GrantTier = "plus" | "pro";

const DURATION_OPTIONS: { value: AdminGrantDuration; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "365d", label: "1 year" },
  { value: "lifetime", label: "Lifetime" },
];

function billingSourceLabel(source: AdminUserDetail["billingSource"]) {
  if (source === "paddle") return "Paid (Paddle)";
  if (source === "admin") return "Admin grant";
  return "None";
}

export function AdminSubscriptionControls({
  user,
  onUpdated,
}: {
  user: AdminUserDetail;
  onUpdated: () => Promise<void>;
}) {
  const [grantTier, setGrantTier] = useState<GrantTier>("plus");
  const [grantDuration, setGrantDuration] = useState<AdminGrantDuration>("30d");
  const [customDays, setCustomDays] = useState("60");
  const [billingAction, setBillingAction] = useState<string | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState("");

  const hasPaidAccess =
    user.effectiveTier === "plus" || user.effectiveTier === "pro";
  const revokePhrase = user.isPaidSubscription
    ? (user.email ?? user.userId)
    : "REVOKE";

  async function runGrant() {
    const duration: AdminGrantDuration | number =
      grantDuration === "custom" ? Number(customDays) : grantDuration;

    if (
      grantDuration === "custom" &&
      (!Number.isFinite(duration) || (duration as number) <= 0)
    ) {
      toast.error("Enter a valid number of days");
      return;
    }

    setBillingAction("grant");
    try {
      const res = await fetch(`/api/admin/users/${user.userId}/billing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grant",
          details: { tier: grantTier, duration },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Grant failed");
      toast.success(
        `Granted ${grantTier === "pro" ? "Pro" : "Plus"} access${
          grantDuration === "lifetime"
            ? " (lifetime)"
            : grantDuration === "custom"
              ? ` for ${customDays} days`
              : ""
        }`
      );
      await onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Grant failed");
    } finally {
      setBillingAction(null);
    }
  }

  async function runRevoke() {
    setBillingAction("revoke");
    try {
      const res = await fetch(`/api/admin/users/${user.userId}/billing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Revoke failed");
      toast.success("Subscription access revoked");
      setRevokeOpen(false);
      setRevokeConfirm("");
      await onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setBillingAction(null);
    }
  }

  const revokeReady =
    revokeConfirm.trim().toLowerCase() === revokePhrase.trim().toLowerCase();

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Subscription</h3>
          <p className="mt-1 text-xs text-muted">{BILLING_STATUS.message}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{billingSourceLabel(user.billingSource)}</Badge>
          {user.isPaidSubscription && (
            <Badge variant="warning">Paid subscription</Badge>
          )}
          {user.isAdminGrant && (
            <Badge variant="outline">Admin comp</Badge>
          )}
        </div>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-3 sm:block">
          <dt className="text-muted">Effective tier</dt>
          <dd className="font-medium capitalize">{user.effectiveTier}</dd>
        </div>
        <div className="flex justify-between gap-3 sm:block">
          <dt className="text-muted">Status</dt>
          <dd>
            {user.subscriptionStatus}
            {user.cancelAtPeriodEnd ? " · cancel at period end" : ""}
          </dd>
        </div>
        {user.currentPeriodEnd && (
          <div className="flex justify-between gap-3 sm:block sm:col-span-2">
            <dt className="text-muted">
              {user.isAdminGrant ? "Grant expires" : "Period end"}
            </dt>
            <dd>{new Date(user.currentPeriodEnd).toLocaleString()}</dd>
          </div>
        )}
        {user.isAdminGrant && !user.currentPeriodEnd && (
          <div className="sm:col-span-2 text-muted">Lifetime admin grant</div>
        )}
      </dl>

      <Separator />

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Grant access</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-1.5 sm:w-36">
            <label className="text-xs font-medium text-muted" htmlFor="grant-tier">
              Tier
            </label>
            <select
              id="grant-tier"
              value={grantTier}
              onChange={(e) => setGrantTier(e.target.value as GrantTier)}
              className="flex h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
            >
              <option value="plus">Plus</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:w-44">
            <label className="text-xs font-medium text-muted" htmlFor="grant-duration">
              Duration
            </label>
            <select
              id="grant-duration"
              value={grantDuration}
              onChange={(e) =>
                setGrantDuration(e.target.value as AdminGrantDuration)
              }
              className="flex h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
              <option value="custom">Custom days…</option>
            </select>
          </div>
          {grantDuration === "custom" && (
            <div className="space-y-1.5 sm:w-28">
              <label className="text-xs font-medium text-muted" htmlFor="custom-days">
                Days
              </label>
              <Input
                id="custom-days"
                type="number"
                min={1}
                max={3650}
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
              />
            </div>
          )}
          <Button
            type="button"
            loading={billingAction === "grant"}
            disabled={user.isPaidSubscription}
            onClick={() => void runGrant()}
          >
            Grant {grantTier === "pro" ? "Pro" : "Plus"}
          </Button>
        </div>
        {user.isPaidSubscription ? (
          <p className="text-xs text-destructive">
            Revoke the paid Paddle subscription before granting admin access.
          </p>
        ) : (
          <p className="text-xs text-muted">
            Admin grants bypass Paddle billing and expire automatically when a
            duration is set.
          </p>
        )}
      </div>

      <Separator />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="destructive"
          disabled={!hasPaidAccess}
          onClick={() => {
            setRevokeConfirm("");
            setRevokeOpen(true);
          }}
        >
          Revoke access
        </Button>
        {!hasPaidAccess && (
          <p className="text-xs text-muted">User is already on Free.</p>
        )}
      </div>

      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              {user.isPaidSubscription
                ? "Revoke paid subscription"
                : "Revoke subscription access"}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-left text-sm text-muted">
                {user.isPaidSubscription ? (
                  <>
                    <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-foreground">
                      This user has a <strong>paid Paddle subscription</strong>.
                      Revoking will cancel billing immediately in Paddle and
                      downgrade them to Free right away. Scene data is kept, but
                      Plus/Pro limits apply until they resubscribe.
                    </p>
                    <p>
                      Type the user&apos;s email to confirm:{" "}
                      <span className="font-mono text-foreground">{revokePhrase}</span>
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      This will remove {user.effectiveTier} access and downgrade
                      the user to Free. Their scenes stay saved; only unlock
                      limits change.
                    </p>
                    <p>
                      Type <span className="font-mono text-foreground">REVOKE</span>{" "}
                      to confirm.
                    </p>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <Input
            value={revokeConfirm}
            onChange={(e) => setRevokeConfirm(e.target.value)}
            placeholder={user.isPaidSubscription ? "User email" : "REVOKE"}
            autoComplete="off"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRevokeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!revokeReady}
              loading={billingAction === "revoke"}
              onClick={() => void runRevoke()}
            >
              {user.isPaidSubscription
                ? "Cancel Paddle & revoke"
                : "Revoke access"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
