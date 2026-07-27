"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { PricingComparisonTable } from "@/components/marketing/pricing-comparison-table";
import { PaddlePricingTierCards } from "@/components/marketing/paddle-pricing-tier-cards";
import { PaddleProvider } from "@/components/billing/paddle-provider";
import {
  isPaidTier,
  type PaddleCatalogTier,
  type PaidPlanId,
} from "@/lib/constants/paddle-tiers";
import {
  hasMinTier,
  type SubscriptionTierId,
} from "@/lib/constants/entitlements";
import type { BillingPeriod } from "@/lib/constants/pricing";
import { usePaddlePricePreview } from "@/hooks/use-paddle-price-preview";
import { useBillingPlanAction } from "@/hooks/use-billing-plan-action";
import { PlanChangeConfirmDialog } from "@/components/billing/plan-change-confirm-dialog";
import type { ChangePlanPreview } from "@/lib/services/billing/types";
import { toast } from "sonner";
import { usePaddle } from "@/components/billing/paddle-provider";
import { cn } from "@/lib/utils";

const billingOptions: {
  value: BillingPeriod;
  label: string;
  note: string;
}[] = [
  { value: "monthly", label: "Monthly", note: "Pay month to month" },
  { value: "annual", label: "Annual", note: "Save with yearly billing" },
];

function PricingPageInner({
  tiers,
  countryCode,
  pricesConfigured,
}: {
  tiers: PaddleCatalogTier[];
  countryCode?: string;
  pricesConfigured: boolean;
}) {
  const searchParams = useSearchParams();
  const { status } = useSession();
  const { error: paddleError } = usePaddle();
  const [period, setPeriod] = useState<BillingPeriod>(() => {
    const interval = searchParams.get("interval");
    return interval === "monthly" ? "monthly" : "annual";
  });
  const [effectiveTier, setEffectiveTier] =
    useState<SubscriptionTierId>("free");
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);
  const autoCheckoutAttempted = useRef(false);
  const [subscribeLoading, setSubscribeLoading] = useState<PaidPlanId | null>(
    null
  );
  const [planPreviewOpen, setPlanPreviewOpen] = useState(false);
  const [planPreview, setPlanPreview] = useState<ChangePlanPreview | null>(null);
  const [pendingPlan, setPendingPlan] = useState<PaidPlanId | null>(null);
  const [planChangeLoading, setPlanChangeLoading] = useState(false);

  const {
    prices,
    pricesByPeriod,
    loading: pricesLoading,
    initialLoading: pricesInitialLoading,
    error: pricesError,
  } = usePaddlePricePreview({
    tiers,
    period,
    countryCode,
    enabled: pricesConfigured,
  });
  const { selectPlan, changePlan, previewPlanChange } = useBillingPlanAction();

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
      toast.success(
        pendingPlan === "pro"
          ? "Upgraded to Pro. Prorated billing was applied."
          : "Switched to Plus. Prorated billing was applied."
      );
      setEffectiveTier(pendingPlan);
      setPlanPreviewOpen(false);
      setPlanPreview(null);
      setPendingPlan(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Plan change failed");
    } finally {
      setPlanChangeLoading(false);
    }
  }

  useEffect(() => {
    if (status !== "authenticated") {
      setEffectiveTier("free");
      setSubscriptionLoaded(true);
      return;
    }
    let cancelled = false;
    void fetch("/api/billing/subscription")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as {
          effectiveTier?: SubscriptionTierId;
        };
        if (!cancelled) setEffectiveTier(data.effectiveTier ?? "free");
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSubscriptionLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    const interval = searchParams.get("interval");
    if (interval === "monthly" || interval === "annual") {
      setPeriod(interval);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!subscriptionLoaded || autoCheckoutAttempted.current) return;

    const plan = searchParams.get("plan");
    const interval = searchParams.get("interval");
    if (plan !== "plus" && plan !== "pro") return;
    if (status !== "authenticated") return;
    if (hasMinTier(effectiveTier, plan)) return;

    const tier = tiers.find((t) => t.id === plan);
    if (!tier || !isPaidTier(tier)) return;

    autoCheckoutAttempted.current = true;
    const checkoutPeriod: BillingPeriod =
      interval === "monthly" ? "monthly" : "annual";
    setSubscribeLoading(plan);
    void selectPlan({ tier, period: checkoutPeriod })
      .then(async (result) => {
        if ("needsConfirm" in result && result.needsConfirm) {
          await beginPlanChange(result.plan);
          return;
        }
        if (result.changed) {
          setEffectiveTier(plan);
        }
      })
      .finally(() => {
      setSubscribeLoading(null);
    });
  }, [
    subscriptionLoaded,
    searchParams,
    status,
    tiers,
    effectiveTier,
    selectPlan,
  ]);

  async function handleSubscribe(tier: PaddleCatalogTier) {
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

  const subscriberLabel =
    effectiveTier === "pro"
      ? "You’re on Pro"
      : effectiveTier === "plus"
        ? "You’re on Plus"
        : null;

  const configError = !pricesConfigured
    ? "Paid plan prices are not configured on the server yet. Add PADDLE_PRICE_* env vars in Vercel and redeploy."
    : paddleError;
  const displayError = configError ?? pricesError;

  return (
    <div className="marketing-page pricing-page relative min-h-dvh overflow-hidden bg-background text-foreground">
      <MarketingNav />

      <div className="pricing-aurora pricing-aurora--one" aria-hidden />
      <div className="pricing-aurora pricing-aurora--two" aria-hidden />
      <div className="pricing-orbit pricing-orbit--one" aria-hidden />
      <div className="pricing-orbit pricing-orbit--two" aria-hidden />
      <div className="pricing-grid" aria-hidden />
      <span className="pricing-kanji font-brush" aria-hidden>
        料金
      </span>

      <main className="relative z-[2] mx-auto max-w-[1200px] px-4 pb-24 pt-[calc(8rem+env(safe-area-inset-top,0px))] sm:px-8 md:pt-40">
        <motion.header
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 17 }}
        >
          <span className="inline-flex rounded-full border border-border bg-surface/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted backdrop-blur-md">
            Secure checkout · Paddle
          </span>
          {subscriberLabel && (
            <p className="mt-4 inline-flex rounded-full border border-[color:var(--mode-listen)]/35 bg-[color:var(--mode-listen)]/10 px-3 py-1 text-xs font-semibold text-[color:var(--mode-listen)]">
              {subscriberLabel}
            </p>
          )}
          <h1 className="marketing-giant-type mt-7 text-[clamp(3.2rem,8vw,6.8rem)]">
            Pick your pace.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            Start free. Move to Plus for Essentials and narration. Pro adds voice
            control, exports, and room for a serious library.
          </p>
          {countryCode && (
            <p className="mt-3 text-xs text-muted">
              Prices localized for {countryCode}
            </p>
          )}
        </motion.header>

        {displayError && (
          <p
            role="alert"
            className="mx-auto mt-6 max-w-lg rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
          >
            {displayError}
          </p>
        )}

        <motion.div
          className="mx-auto mt-10 grid max-w-md grid-cols-2 rounded-2xl border border-border bg-surface/75 p-1.5 shadow-md backdrop-blur-xl"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 130,
            damping: 18,
            delay: 0.12,
          }}
          role="group"
          aria-label="Billing period"
        >
          {billingOptions.map((option) => {
            const selected = period === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className="relative min-h-14 rounded-xl px-2 py-2 text-center"
                onClick={() => setPeriod(option.value)}
                aria-pressed={selected}
              >
                {selected && (
                  <motion.span
                    layoutId="pricing-period-active"
                    className="absolute inset-0 rounded-xl bg-foreground shadow-sm"
                    transition={{ type: "spring", stiffness: 360, damping: 30 }}
                  />
                )}
                <span
                  className={cn(
                    "relative z-[1] block text-xs font-semibold transition-colors",
                    selected ? "text-background" : "text-foreground"
                  )}
                >
                  {option.label}
                </span>
                <span
                  className={cn(
                    "relative z-[1] mt-0.5 block text-[10px] transition-colors",
                    selected ? "text-background/70" : "text-muted"
                  )}
                >
                  {option.note}
                </span>
              </button>
            );
          })}
        </motion.div>

        <section className="mt-12">
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
          />
        </section>

        <section className="mt-12 sm:mt-14">
          <h2 className="text-center font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Compare plans
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted">
            Caps and gated features side by side — scan what changes as you upgrade.
          </p>
          <div className="mt-8">
            <PricingComparisonTable />
          </div>
        </section>

        <motion.aside
          className="mx-auto mt-12 max-w-3xl rounded-2xl border border-dashed border-border bg-surface/55 p-5 text-center text-sm leading-relaxed text-muted backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Cancel anytime — paid access continues through the end of the billing
          period. Manage invoices and payment methods from{" "}
          <Link
            href="/settings"
            className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4"
          >
            Settings
          </Link>
          .
        </motion.aside>
      </main>

      <div className="relative z-[2]">
        <MarketingFooter />
      </div>

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

export function PricingPageExperience({
  tiers,
  countryCode,
  pricesConfigured,
}: {
  tiers: PaddleCatalogTier[];
  countryCode?: string;
  pricesConfigured: boolean;
}) {
  return (
    <PaddleProvider enabled={pricesConfigured}>
      <PricingPageInner
        tiers={tiers}
        countryCode={countryCode}
        pricesConfigured={pricesConfigured}
      />
    </PaddleProvider>
  );
}
