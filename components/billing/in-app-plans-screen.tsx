"use client";

import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { PaddleProvider, usePaddle } from "@/components/billing/paddle-provider";
import { PlanChangeConfirmDialog } from "@/components/billing/plan-change-confirm-dialog";
import { PaddlePricingTierCards } from "@/components/marketing/paddle-pricing-tier-cards";
import { PricingComparisonTable } from "@/components/marketing/pricing-comparison-table";
import { Card } from "@/components/ui/card";
import {
  hasMinTier,
  type SubscriptionTierId,
} from "@/lib/constants/entitlements";
import {
  getPaddleCatalogTiers,
  isPaidTier,
  type PaidPlanId,
} from "@/lib/constants/paddle-tiers";
import type { BillingPeriod } from "@/lib/constants/pricing";
import { usePaddlePricePreview } from "@/hooks/use-paddle-price-preview";
import { useBillingPlanAction } from "@/hooks/use-billing-plan-action";
import type { ChangePlanPreview } from "@/lib/services/billing/types";
import { toast } from "sonner";

type SubscriptionSnapshot = {
  effectiveTier?: SubscriptionTierId;
};

const billingOptions: { value: BillingPeriod; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];

function PlansScreenInner() {
  const { error: paddleError } = usePaddle();
  const { tiers, pricesConfigured } = getPaddleCatalogTiers();
  const [period, setPeriod] = useState<BillingPeriod>("annual");
  const [effectiveTier, setEffectiveTier] =
    useState<SubscriptionTierId>("free");
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState<PaidPlanId | null>(
    null
  );
  const [planPreviewOpen, setPlanPreviewOpen] = useState(false);
  const [planPreview, setPlanPreview] = useState<ChangePlanPreview | null>(null);
  const [pendingPlan, setPendingPlan] = useState<PaidPlanId | null>(null);
  const [planChangeLoading, setPlanChangeLoading] = useState(false);
  const { selectPlan, changePlan, previewPlanChange } = useBillingPlanAction();

  const {
    prices,
    pricesByPeriod,
    loading: pricesLoading,
    initialLoading: pricesInitialLoading,
    error: pricesError,
  } = usePaddlePricePreview({
    tiers,
    period,
    enabled: pricesConfigured,
  });

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/billing/subscription")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as SubscriptionSnapshot;
        if (!cancelled) setEffectiveTier(data.effectiveTier ?? "free");
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSubscriptionLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function beginPlanChange(plan: PaidPlanId) {
    setPlanChangeLoading(true);
    try {
      const preview = await previewPlanChange(plan);
      setPlanPreview(preview);
      setPendingPlan(plan);
      setPlanPreviewOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not preview plan change");
    } finally {
      setPlanChangeLoading(false);
    }
  }

  async function confirmPlanChange() {
    if (!pendingPlan) return;
    setPlanChangeLoading(true);
    try {
      await changePlan(pendingPlan);
      setEffectiveTier(pendingPlan);
      setPlanPreviewOpen(false);
      setPlanPreview(null);
      setPendingPlan(null);
      toast.success(
        pendingPlan === "pro"
          ? "Upgraded to Pro. Prorated billing was applied."
          : "Switched to Plus. Prorated billing was applied."
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Plan change failed");
    } finally {
      setPlanChangeLoading(false);
    }
  }

  async function handleSubscribe(
    tier: (typeof tiers)[number]
  ) {
    if (!isPaidTier(tier)) return;
    setSubscribeLoading(tier.id);
    try {
      const result = await selectPlan({ tier, period });
      if ("needsConfirm" in result && result.needsConfirm) {
        await beginPlanChange(result.plan);
        return;
      }
      if (result.changed) {
        setEffectiveTier(tier.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update plan");
    } finally {
      setSubscribeLoading(null);
    }
  }

  const displayError = !pricesConfigured
    ? "Paid plan prices are not configured yet."
    : paddleError ?? pricesError;

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-surface-raised p-3">
            <CreditCard className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Plans
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Upgrade, downgrade, or compare features without leaving the app.
              If you launch Matomari from your home screen, this is the place to
              manage paid access.
            </p>
            {subscriptionLoaded && hasMinTier(effectiveTier, "plus") && (
              <p className="mt-3 text-sm font-medium text-foreground">
                Current plan: {effectiveTier === "pro" ? "Pro" : "Plus"}
              </p>
            )}
          </div>
        </div>
      </Card>

      {displayError && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {displayError}
        </p>
      )}

      <Card className="p-4 sm:p-5">
        <div
          className="grid max-w-sm grid-cols-2 rounded-2xl border border-border bg-surface/75 p-1.5"
          role="group"
          aria-label="Billing period"
        >
          {billingOptions.map((option) => {
            const selected = period === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={
                  selected
                    ? "rounded-xl bg-foreground px-3 py-2 text-sm font-semibold text-background"
                    : "rounded-xl px-3 py-2 text-sm font-semibold text-foreground"
                }
                onClick={() => setPeriod(option.value)}
                aria-pressed={selected}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          <PaddlePricingTierCards
            tiers={tiers}
            period={period}
            prices={prices}
            pricesByPeriod={pricesByPeriod}
            pricesLoading={pricesLoading}
            pricesInitialLoading={pricesInitialLoading}
            effectiveTier={effectiveTier}
            onSubscribe={(tier) => void handleSubscribe(tier)}
            subscribeLoading={subscribeLoading}
            compact
          />
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Compare features
        </h2>
        <p className="mt-2 text-sm text-muted">
          See what changes between Free, Plus, and Pro before you switch.
        </p>
        <PricingComparisonTable className="mt-6" />
      </Card>

      <PlanChangeConfirmDialog
        open={planPreviewOpen}
        preview={planPreview}
        loading={planChangeLoading}
        onCancel={() => {
          setPlanPreviewOpen(false);
          setPlanPreview(null);
          setPendingPlan(null);
        }}
        onConfirm={() => void confirmPlanChange()}
      />
    </div>
  );
}

export function InAppPlansScreen() {
  const { pricesConfigured } = getPaddleCatalogTiers();

  return (
    <PaddleProvider enabled={pricesConfigured}>
      <PlansScreenInner />
    </PaddleProvider>
  );
}
