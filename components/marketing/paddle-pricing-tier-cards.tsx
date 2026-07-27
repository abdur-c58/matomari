"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  isPaidTier,
  type PaddleCatalogTier,
  type PaidPlanId,
} from "@/lib/constants/paddle-tiers";
import type { SubscriptionTierId } from "@/lib/constants/entitlements";
import type { BillingPeriod } from "@/lib/constants/pricing";
import type { PaddleTierPrice } from "@/hooks/use-paddle-price-preview";
import { PaddlePriceCountup } from "@/components/marketing/paddle-price-countup";
import { formatAnimatedAmount } from "@/lib/paddle/price-display";
import { cn } from "@/lib/utils";

function TierPriceBlock({
  tierId,
  period,
  price,
  loading,
}: {
  tierId: PaddleCatalogTier["id"];
  period: BillingPeriod;
  price?: PaddleTierPrice;
  loading: boolean;
}) {
  if (tierId === "free") {
    return (
      <>
        <div className="flex items-end gap-1.5">
          <span className="font-display text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
            $0
          </span>
          <span className="pb-1.5 text-sm text-muted">forever</span>
        </div>
        <p className="mt-1.5 text-sm text-muted">No card required.</p>
      </>
    );
  }

  if (loading || !price) {
    return (
      <div className="min-h-[5.5rem] space-y-2" aria-busy="true">
        <div className="h-12 w-32 animate-pulse rounded-lg bg-surface-raised" />
        <div className="h-4 w-24 animate-pulse rounded bg-surface-raised" />
      </div>
    );
  }

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-end gap-1.5">
          <PaddlePriceCountup
            price={price}
            className="font-display text-4xl font-semibold tracking-[-0.06em] sm:text-5xl"
          />
          <span className="pb-1.5 text-sm text-muted">/ mo</span>
        </div>
        <p className="mt-1.5 text-sm text-muted">{price.billingLabel}</p>
      </motion.div>
    </motion.div>
  );
}

export function PaddlePricingTierCards({
  tiers,
  period,
  prices,
  pricesByPeriod,
  pricesLoading,
  pricesInitialLoading,
  effectiveTier,
  onSubscribe,
  subscribeLoading,
  compact = false,
}: {
  tiers: PaddleCatalogTier[];
  period: BillingPeriod;
  prices: Partial<Record<PaidPlanId, PaddleTierPrice>>;
  pricesByPeriod: Partial<
    Record<BillingPeriod, Partial<Record<PaidPlanId, PaddleTierPrice>>>
  >;
  pricesLoading: boolean;
  pricesInitialLoading?: boolean;
  effectiveTier: SubscriptionTierId;
  onSubscribe: (tier: PaddleCatalogTier) => void;
  subscribeLoading?: PaidPlanId | null;
  compact?: boolean;
}) {
  function derivedTierPrice(tierId: PaidPlanId): PaddleTierPrice | undefined {
    if (period !== "annual") return pricesByPeriod.monthly?.[tierId];

    const monthly = pricesByPeriod.monthly?.[tierId];
    const annual = pricesByPeriod.annual?.[tierId];
    if (!monthly || !annual) return undefined;

    const monthlyEq = Math.round((annual.amount / 12) * 100) / 100;
    return {
      total: formatAnimatedAmount(monthlyEq, monthly.displayParts),
      billingLabel: annual.billingLabel,
      amount: monthlyEq,
      displayParts: monthly.displayParts,
    };
  }

  function discountPct(tierId: PaidPlanId): number | null {
    const monthly = pricesByPeriod.monthly?.[tierId];
    const annual = pricesByPeriod.annual?.[tierId];
    if (!monthly || !annual) return null;
    if (!Number.isFinite(monthly.amount) || monthly.amount <= 0) return null;

    const monthlyEq = annual.amount / 12;
    const raw = (1 - monthlyEq / monthly.amount) * 100;
    if (!Number.isFinite(raw)) return null;

    const clamped = Math.max(0, Math.min(95, raw));
    return Math.round(clamped);
  }

  return (
    <div
      className={cn(
        "grid gap-4",
        compact ? "md:grid-cols-3 md:gap-5" : "md:grid-cols-3 md:gap-5"
      )}
    >
      {tiers.map((tier) => {
        const isPro = tier.id === "pro";
        const isPlus = tier.id === "plus";
        const paid = isPaidTier(tier);
        const onCurrentTier = effectiveTier === tier.id;
        const manageInstead = paid && onCurrentTier;
        const canSwitchTier =
          paid &&
          !onCurrentTier &&
          ((tier.id === "pro" && effectiveTier === "plus") ||
            (tier.id === "plus" && effectiveTier === "pro"));

        const derivedPrice =
          paid && (tier.id === "plus" || tier.id === "pro")
            ? derivedTierPrice(tier.id)
            : undefined;

        const showAnnualGlow = period === "annual" && tier.id === "pro";
        const savePct =
          period === "annual" && paid && (tier.id === "plus" || tier.id === "pro")
            ? discountPct(tier.id)
            : null;

        return (
          <article
            key={tier.id}
            className={cn(
              "relative flex flex-col rounded-[1.75rem] border p-5 sm:p-6",
              compact && "marketing-depth-shell rounded-[1.5rem]",
              isPro
                ? "border-[color:var(--mode-listen)] bg-surface"
                : isPlus
                  ? "border-[color:var(--mode-review)]/45 bg-surface"
                  : "border-border bg-surface/75"
            )}
            style={
              showAnnualGlow
                ? {
                    boxShadow:
                      "0 0 0 1px color-mix(in srgb, var(--mode-listen) 35%, transparent), 0 0 28px color-mix(in srgb, var(--mode-listen) 55%, transparent)",
                  }
                : undefined
            }
          >
            {isPro && !compact && (
              <div
                className="pointer-events-none absolute inset-0 rounded-[1.75rem] opacity-70"
                aria-hidden
                style={{
                  background:
                    "radial-gradient(ellipse at 80% 0%, color-mix(in srgb, var(--mode-listen) 16%, transparent), transparent 55%)",
                }}
              />
            )}

            {savePct !== null && savePct > 0 && (
              <div className="absolute right-4 top-4 z-[3] flex flex-col items-end gap-1">
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-semibold",
                    isPro
                      ? "border-[color:var(--mode-listen)]/40 bg-[color:var(--mode-listen)]/10 text-[color:var(--mode-listen)]"
                      : "border-[color:var(--mode-review)]/40 bg-[color:var(--mode-review)]/10 text-[color:var(--mode-review)]"
                  )}
                >
                  Save {savePct}%
                </span>
                {isPro && (
                  <span className="rounded-full bg-foreground/10 px-3 py-1 text-[11px] font-semibold text-foreground">
                    Recommended
                  </span>
                )}
              </div>
            )}

            <div className="relative z-[1]">
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{
                  color: isPro
                    ? "var(--mode-listen)"
                    : isPlus
                      ? "var(--mode-review)"
                      : "var(--mode-meaning)",
                }}
              >
                {tier.eyebrow}
              </p>
              <h2
                className={cn(
                  "mt-2 font-semibold tracking-tight",
                  compact
                    ? "font-display text-3xl"
                    : "font-display text-3xl tracking-[-0.04em]"
                )}
              >
                {tier.name}
              </h2>

              <div className="mt-6 min-h-[5.5rem]">
                <TierPriceBlock
                  tierId={tier.id}
                  period={period}
                  price={paid ? derivedPrice : undefined}
                  loading={paid && pricesLoading}
                />
              </div>

              <p className="mt-4 text-sm leading-relaxed text-muted">
                {tier.description}
              </p>

              {!compact && (
                <ul className="mt-4 space-y-1.5 text-sm text-foreground/85">
                  {tier.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="relative z-[1] mt-6">
              {tier.id === "free" ? (
                <Link
                  href="/today"
                  className={cn(
                    "flex w-full items-center justify-center rounded-xl bg-cta text-sm font-semibold text-cta-foreground",
                    compact ? "h-10" : "pricing-free-cta h-11"
                  )}
                >
                  Continue with Free
                </Link>
              ) : manageInstead ? (
                <Link
                  href="/settings"
                  className={cn(
                    "flex w-full items-center justify-center rounded-xl border border-border bg-transparent text-sm font-semibold text-foreground transition-colors hover:bg-surface-raised",
                    compact ? "h-10" : "h-11"
                  )}
                >
                  Manage in Settings
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => onSubscribe(tier)}
                  disabled={
                    subscribeLoading === tier.id ||
                    (paid && (pricesInitialLoading ?? pricesLoading))
                  }
                  className={cn(
                    "flex w-full items-center justify-center rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
                    compact ? "h-10" : "h-11",
                    isPro
                      ? "bg-[color:var(--mode-listen)]"
                      : "bg-[color:var(--mode-review)]"
                  )}
                >
                  {subscribeLoading === tier.id
                    ? canSwitchTier
                      ? "Updating plan…"
                      : "Opening checkout…"
                    : canSwitchTier
                      ? tier.id === "pro"
                        ? "Upgrade to Pro"
                        : "Switch to Plus"
                      : `Subscribe to ${tier.name}`}
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
