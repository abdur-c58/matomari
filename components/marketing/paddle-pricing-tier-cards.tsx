"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  isPaidTier,
  type PaddleCatalogTier,
  type PaidPlanId,
} from "@/lib/constants/paddle-tiers";
import {
  hasMinTier,
  type SubscriptionTierId,
} from "@/lib/constants/entitlements";
import type { PaddleTierPrice } from "@/hooks/use-paddle-price-preview";
import { PaddlePriceCountup } from "@/components/marketing/paddle-price-countup";
import { cn } from "@/lib/utils";

function TierPriceBlock({
  tierId,
  price,
  loading,
}: {
  tierId: PaddleCatalogTier["id"];
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
      key={price.billingLabel}
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-end gap-1.5">
        <PaddlePriceCountup
          price={price}
          className="font-display text-4xl font-semibold tracking-[-0.06em] sm:text-5xl"
        />
      </div>
      <p className="mt-1.5 text-sm text-muted">{price.billingLabel}</p>
    </motion.div>
  );
}

export function PaddlePricingTierCards({
  tiers,
  prices,
  pricesLoading,
  pricesInitialLoading,
  effectiveTier,
  onSubscribe,
  subscribeLoading,
  compact = false,
}: {
  tiers: PaddleCatalogTier[];
  prices: Partial<Record<PaidPlanId, PaddleTierPrice>>;
  pricesLoading: boolean;
  pricesInitialLoading?: boolean;
  effectiveTier: SubscriptionTierId;
  onSubscribe: (tier: PaddleCatalogTier) => void;
  subscribeLoading?: PaidPlanId | null;
  compact?: boolean;
}) {
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
        const manageInstead =
          paid &&
          ((isPlus && hasMinTier(effectiveTier, "plus")) ||
            (isPro && hasMinTier(effectiveTier, "pro")));

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
                  price={paid ? prices[tier.id] : undefined}
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
                    ? "Opening checkout…"
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
