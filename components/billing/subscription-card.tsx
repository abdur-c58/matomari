"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { EntitlementCaps } from "@/lib/constants/entitlements";
import {
  hasMinTier,
  type SubscriptionTierId,
} from "@/lib/constants/entitlements";
import {
  formatUsd,
  PLUS_PRICE_MONTHLY_USD,
  PRO_PRICE_MONTHLY_USD,
} from "@/lib/constants/pricing";
import type { UserSubscriptionRow } from "@/lib/services/billing";
import type { ChangePlanPreview } from "@/lib/services/billing/types";
import { useBillingPlanAction } from "@/hooks/use-billing-plan-action";
import { PlanChangeConfirmDialog } from "@/components/billing/plan-change-confirm-dialog";

type SubResponse = {
  simulation: boolean;
  plusPriceMonthly: number;
  proPriceMonthly?: number;
  plusPriceLabel?: string;
  proPriceLabel?: string;
  subscription: UserSubscriptionRow | null;
  effectiveTier: SubscriptionTierId;
  caps: EntitlementCaps;
  billingSource?: "none" | "admin" | "paddle";
  canChangePlan?: boolean;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

function tierLabel(tier: SubscriptionTierId) {
  if (tier === "pro") return "Pro";
  if (tier === "plus") return "Plus";
  return "Free";
}

export function SubscriptionCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { changePlan, previewPlanChange } = useBillingPlanAction();
  const upgraded = searchParams.get("upgraded") === "1";
  const [data, setData] = useState<SubResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [confirming, setConfirming] = useState(upgraded);
  const [planPreviewOpen, setPlanPreviewOpen] = useState(false);
  const [planPreview, setPlanPreview] = useState<ChangePlanPreview | null>(null);
  const [pendingPlan, setPendingPlan] = useState<"plus" | "pro" | null>(null);
  const pollAttempts = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/subscription");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load subscription");
      setData(json);
      return json as SubResponse;
    } catch (err) {
      console.warn(err);
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!upgraded) return;
    let cancelled = false;
    pollAttempts.current = 0;

    async function poll() {
      const json = await load();
      if (cancelled) return;
      if (json && hasMinTier(json.effectiveTier, "plus")) {
        setConfirming(false);
        toast.success(`${tierLabel(json.effectiveTier)} is active`);
        router.replace("/settings");
        return;
      }
      pollAttempts.current += 1;
      if (pollAttempts.current < 15) {
        setConfirming(true);
        window.setTimeout(() => {
          void poll();
        }, 1500);
      } else {
        setConfirming(false);
        toast.message(
          "Payment received — your plan may take a moment to appear. Refresh if needed."
        );
        router.replace("/settings");
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [upgraded, load, router]);

  async function cancel() {
    setActing(true);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Cancel failed");
      toast.success("Paid plan will end at the current period end");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setActing(false);
    }
  }

  async function startSwitchPlan(plan: "plus" | "pro") {
    setActing(true);
    try {
      const preview = await previewPlanChange(plan);
      setPlanPreview(preview);
      setPendingPlan(plan);
      setPlanPreviewOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Plan change failed");
    } finally {
      setActing(false);
    }
  }

  async function confirmSwitchPlan() {
    if (!pendingPlan) return;
    setActing(true);
    try {
      await changePlan(pendingPlan);
      const label = pendingPlan === "pro" ? "Pro" : "Plus";
      toast.success(
        pendingPlan === "pro"
          ? `Upgraded to ${label}. Prorated billing was applied.`
          : `Switched to ${label}. Prorated billing was applied.`
      );
      setPlanPreviewOpen(false);
      setPlanPreview(null);
      setPendingPlan(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Plan change failed");
    } finally {
      setActing(false);
    }
  }

  async function openPortal() {
    setActing(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: `${window.location.origin}/settings` }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Portal unavailable");
      if (!json.url) throw new Error("Portal URL missing");
      window.location.href = json.url as string;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Portal unavailable");
      setActing(false);
    }
  }

  if (loading && !data) {
    return (
      <Card className="mb-6 p-4">
        <p className="text-sm text-muted">Loading plan…</p>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const effective = data.effectiveTier;
  const sub = data.subscription;
  const isPaid = hasMinTier(effective, "plus");
  const cancelScheduled = Boolean(sub?.cancelAtPeriodEnd && isPaid);
  const paymentFailed = sub?.status === "past_due" && !isPaid;

  return (
    <Card className="mb-6 space-y-4 p-4">
      {confirming && (
        <p className="rounded-lg bg-surface-raised px-3 py-2 text-sm text-muted">
          Confirming your subscription…
        </p>
      )}

      {paymentFailed && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-foreground">
          Your last payment didn&apos;t go through, so Plus/Pro access has ended.
          Your scenes are still saved — resubscribe to unlock them again.
        </p>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">Plan</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge
              variant={
                effective === "pro"
                  ? "warning"
                  : effective === "plus"
                    ? "secondary"
                    : "outline"
              }
            >
              {tierLabel(effective)}
            </Badge>
            {sub?.status && (
              <span className="text-xs text-muted">Status: {sub.status}</span>
            )}
          </div>
        </div>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Scenes</dt>
          <dd>Up to {data.caps.maxScenes}</dd>
        </div>
        <div>
          <dt className="text-muted">Sentences / scene</dt>
          <dd>Up to {data.caps.maxSentencesPerScene}</dd>
        </div>
        {sub?.currentPeriodEnd && isPaid && (
          <div className="sm:col-span-2">
            <dt className="text-muted">
              {cancelScheduled ? "Access until" : "Renews"}
            </dt>
            <dd>{formatDate(sub.currentPeriodEnd)}</dd>
          </div>
        )}
      </dl>

      <div className="flex flex-wrap gap-2 border-t border-border-subtle pt-4">
        {!isPaid && (
          <>
            <Button type="button" size="sm" asChild>
              <Link href="/plans">
                {paymentFailed ? "Resubscribe to Plus" : "Upgrade to Plus"} (
                {data.plusPriceLabel ?? formatUsd(PLUS_PRICE_MONTHLY_USD)}/mo)
              </Link>
            </Button>
            <Button type="button" size="sm" variant="secondary" asChild>
              <Link href="/plans">
                {paymentFailed ? "Resubscribe to Pro" : "Upgrade to Pro"} (
                {data.proPriceLabel ?? formatUsd(PRO_PRICE_MONTHLY_USD)}/mo)
              </Link>
            </Button>
          </>
        )}
        {effective === "plus" && data.canChangePlan && (
          <Button
            type="button"
            size="sm"
            loading={acting}
            onClick={() => void startSwitchPlan("pro")}
          >
            Upgrade to Pro (
            {data.proPriceLabel ?? formatUsd(PRO_PRICE_MONTHLY_USD)}/mo)
          </Button>
        )}
        {effective === "pro" && data.canChangePlan && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            loading={acting}
            onClick={() => void startSwitchPlan("plus")}
          >
            Switch to Plus (
            {data.plusPriceLabel ?? formatUsd(PLUS_PRICE_MONTHLY_USD)}/mo)
          </Button>
        )}
        {isPaid && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            loading={acting}
            onClick={() => void openPortal()}
          >
            Manage billing
          </Button>
        )}
        {isPaid && !cancelScheduled && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            loading={acting}
            onClick={() => void cancel()}
          >
            Cancel at period end
          </Button>
        )}
        {cancelScheduled && (
          <p className="text-xs text-muted">
            Cancellation scheduled. You keep {tierLabel(effective)} until the
            date above.
          </p>
        )}
        <Button type="button" size="sm" variant="ghost" asChild>
          <Link href="/plans">View plans</Link>
        </Button>
      </div>

      <PlanChangeConfirmDialog
        open={planPreviewOpen}
        preview={planPreview}
        loading={acting}
        onCancel={() => {
          setPlanPreviewOpen(false);
          setPlanPreview(null);
          setPendingPlan(null);
        }}
        onConfirm={() => void confirmSwitchPlan()}
      />
    </Card>
  );
}
