"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { marketingPricingTiers } from "@/lib/constants/marketing-pricing";
import { cn } from "@/lib/utils";

type BillingPeriod = "monthly" | "semiannual" | "annual";

const billingOptions: {
  value: BillingPeriod;
  label: string;
  note: string;
}[] = [
  { value: "monthly", label: "Monthly", note: "Pay month to month" },
  { value: "semiannual", label: "6 months", note: "Save 25%" },
  { value: "annual", label: "Annual", note: "Save 42%" },
];

/** Dummy Plus prices — monthly comes from marketingPricingTiers.plus.priceMonthly. */
const plusPrices: Record<
  BillingPeriod,
  { monthly: number; billed: string; saving?: string }
> = {
  monthly: {
    monthly: marketingPricingTiers.plus.priceMonthly,
    billed: "Billed monthly",
  },
  semiannual: {
    monthly: 9,
    billed: "$54 billed every 6 months",
    saving: "Save $18",
  },
  annual: {
    monthly: 7,
    billed: "$84 billed annually",
    saving: "Save $60",
  },
};

const freeFeatures = [...marketingPricingTiers.free.features];
const plusFeatures = [...marketingPricingTiers.plus.features];

function PriceCard({
  plan,
  period,
}: {
  plan: "free" | "plus";
  period: BillingPeriod;
}) {
  const plus = plan === "plus";
  const price = plusPrices[period];
  const features = plus ? plusFeatures : freeFeatures;

  return (
    <motion.article
      className={cn(
        "pricing-plan-card group relative flex min-h-[38rem] flex-col overflow-hidden rounded-[2rem] border p-6 sm:p-8",
        plus
          ? "pricing-plan-card--plus border-[color:var(--mode-listen)] bg-surface"
          : "border-border bg-surface/75"
      )}
      initial={{ opacity: 0, y: 44, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{
        type: "spring",
        stiffness: 115,
        damping: 18,
        delay: plus ? 0.1 : 0,
      }}
      whileHover={{
        y: -10,
        rotateY: plus ? -2 : 2,
        rotateX: 1,
        transition: { type: "spring", stiffness: 220, damping: 18 },
      }}
    >
      {plus && (
        <>
          <div className="pricing-plan-border" aria-hidden />
          <div className="pricing-plan-sheen" aria-hidden />
        </>
      )}

      <div className="relative z-[1]">
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{
              color: plus
                ? "var(--mode-listen)"
                : "var(--mode-review)",
            }}
          >
            {plus ? "More room to grow" : "Start here"}
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.045em]">
            {plus ? "Plus" : "Free"}
          </h2>
        </div>

        <div className="mt-9 min-h-[7.5rem]">
          {plus ? (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={period}
                initial={{ opacity: 0, y: 16, filter: "blur(5px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(5px)" }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-end gap-2">
                  <span className="font-display text-6xl font-semibold tracking-[-0.07em]">
                    ${price.monthly}
                  </span>
                  <span className="pb-2 text-sm text-muted">/ month</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm text-muted">{price.billed}</p>
                  {price.saving && (
                    <span className="rounded-full bg-[color:var(--mode-review)]/12 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--mode-review)]">
                      {price.saving}
                    </span>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <>
              <div className="flex items-end gap-2">
                <span className="font-display text-6xl font-semibold tracking-[-0.07em]">
                    ${marketingPricingTiers.free.priceMonthly}
                  </span>
                <span className="pb-2 text-sm text-muted">forever</span>
              </div>
              <p className="mt-2 text-sm text-muted">
                No billing period. No card required.
              </p>
            </>
          )}
        </div>

        <p className="mt-5 text-sm leading-relaxed text-muted">
          {plus
            ? "For learners who want broader libraries and deeper visibility into long-term progress."
            : "A complete daily practice loop for building useful Japanese one sentence at a time."}
        </p>
      </div>

      <ul className="relative z-[1] mt-8 space-y-4 border-t border-border pt-7">
        {features.map((feature, index) => (
          <motion.li
            key={feature}
            className="text-sm leading-relaxed text-foreground/90"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.22 + index * 0.055 }}
          >
            {feature}
          </motion.li>
        ))}
      </ul>

      <div className="relative z-[1] mt-auto pt-9">
        {plus ? (
          <button
            type="button"
            disabled
            className="flex h-12 w-full cursor-not-allowed items-center justify-center rounded-2xl border border-[color:var(--mode-listen)]/40 bg-[color:var(--mode-listen)]/10 text-sm font-semibold text-[color:var(--mode-listen)] opacity-80"
          >
            Plus is a pricing preview
          </button>
        ) : (
          <Link
            href="/today"
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-cta text-sm font-semibold text-cta-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Continue with Free
          </Link>
        )}
      </div>
    </motion.article>
  );
}

export function PricingPageExperience() {
  const [period, setPeriod] = useState<BillingPeriod>("annual");

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
            Dummy pricing preview · no checkout
          </span>
          <h1 className="marketing-giant-type mt-7 text-[clamp(3.2rem,8vw,6.8rem)]">
            Pick your pace.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            Start with the complete learning loop for free. Plus is a concept
            preview for learners who want more capacity—the prices and features
            below are placeholders, not a live offer.
          </p>
        </motion.header>

        <motion.div
          className="mx-auto mt-10 grid max-w-2xl grid-cols-3 rounded-2xl border border-border bg-surface/75 p-1.5 shadow-md backdrop-blur-xl"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 130, damping: 18, delay: 0.12 }}
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
                    "relative z-[1] mt-0.5 block text-[9px] transition-colors",
                    selected ? "text-background/70" : "text-muted"
                  )}
                >
                  {option.note}
                </span>
              </button>
            );
          })}
        </motion.div>

        <section className="pricing-card-stage mt-12 grid gap-6 md:grid-cols-2">
          <PriceCard plan="free" period={period} />
          <PriceCard plan="plus" period={period} />
        </section>

        <motion.aside
          className="mx-auto mt-12 max-w-3xl rounded-2xl border border-dashed border-border bg-surface/55 p-5 text-center text-sm leading-relaxed text-muted backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          This page is intentionally a dummy pricing concept. No payment,
          subscription, entitlement, or Plus plan currently exists.
        </motion.aside>
      </main>

      <div className="relative z-[2]">
        <MarketingFooter />
      </div>
    </div>
  );
}
