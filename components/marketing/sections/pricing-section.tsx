"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MarketingAuthCta } from "@/components/marketing/marketing-auth-cta";
import { PricingComparisonTable } from "@/components/marketing/pricing-comparison-table";
import { MARKETING_DESKTOP_MQ } from "@/components/marketing/motion/easings";
import { revealOnMobile } from "@/components/marketing/motion/mobile-scroll-reveal";
import { useGsapContext } from "@/components/marketing/motion/use-gsap-context";
import {
  hasMinTier,
  type SubscriptionTierId,
} from "@/lib/constants/entitlements";
import {
  marketingPricingSection,
  marketingPricingTiers,
} from "@/lib/constants/marketing-pricing";
import { formatUsd } from "@/lib/constants/pricing";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

const tiers = [
  marketingPricingTiers.free,
  marketingPricingTiers.plus,
  marketingPricingTiers.pro,
] as const;

export function PricingSection() {
  const rootRef = useRef<HTMLElement>(null);
  const copy = marketingPricingSection;
  const { status } = useSession();
  const [effectiveTier, setEffectiveTier] =
    useState<SubscriptionTierId>("free");

  useEffect(() => {
    if (status !== "authenticated") {
      setEffectiveTier("free");
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
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status]);

  useGsapContext(rootRef, () => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();

    mm.add(MARKETING_DESKTOP_MQ, () => {
      const intro = root.querySelectorAll("[data-pricing-intro]");
      const cards = root.querySelectorAll("[data-pricing-card]");

      if (intro.length) {
        gsap.fromTo(
          intro,
          { y: 40, opacity: 0.25 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.08,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top 80%",
              end: "top 48%",
              scrub: 0.55,
            },
          }
        );
      }

      cards.forEach((card, index) => {
        gsap.fromTo(
          card,
          {
            y: 56,
            opacity: 0.2,
            rotateY: index === 0 ? 6 : index === 2 ? -6 : 0,
            z: -40,
          },
          {
            y: 0,
            opacity: 1,
            rotateY: 0,
            z: 0,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top 75%",
              end: "top 40%",
              scrub: 0.6,
            },
          }
        );
      });
    });

    revealOnMobile(mm, root, "[data-pricing-intro]", {
      y: 20,
      stagger: 0.08,
    });
    revealOnMobile(mm, root, "[data-pricing-card]", {
      y: 28,
      stagger: 0.14,
      start: "top 86%",
      duration: 0.8,
    });

    return () => mm.revert();
  }, []);

  const subscriberLabel =
    effectiveTier === "pro"
      ? "You’re on Pro"
      : effectiveTier === "plus"
        ? "You’re on Plus"
        : null;

  return (
    <section
      ref={rootRef}
      id="pricing"
      className="marketing-scene relative px-4 py-14 sm:px-8 md:py-24"
      data-placeholder="pricing-sim"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="mx-auto max-w-2xl text-center">
          <p
            data-pricing-intro
            className="inline-flex rounded-full border border-border bg-surface/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted"
          >
            {copy.tag}
          </p>
          {subscriberLabel && (
            <p
              data-pricing-intro
              className="mt-4 inline-flex rounded-full border border-[color:var(--mode-listen)]/35 bg-[color:var(--mode-listen)]/10 px-3 py-1 text-xs font-semibold text-[color:var(--mode-listen)]"
            >
              {subscriberLabel}
            </p>
          )}
          <p
            data-pricing-intro
            className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted"
          >
            {copy.eyebrow}
          </p>
          <h2
            data-pricing-intro
            className="marketing-giant-type mt-3 text-[clamp(2rem,5vw,3.5rem)]"
          >
            {copy.title}
          </h2>
          <p
            data-pricing-intro
            className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted sm:text-base"
          >
            {copy.body}
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:mt-10 md:mt-12 md:grid-cols-3 md:gap-5">
          {tiers.map((tier) => {
            const isPro = tier.id === "pro";
            const isPlus = tier.id === "plus";
            const manageInstead =
              (isPlus && hasMinTier(effectiveTier, "plus")) ||
              (isPro && hasMinTier(effectiveTier, "pro"));

            return (
              <article
                key={tier.id}
                data-pricing-card
                className={cn(
                  "marketing-depth-shell relative flex flex-col rounded-[1.5rem] border p-5 sm:p-6",
                  isPro
                    ? "border-[color:var(--mode-listen)] bg-surface shadow-sm"
                    : isPlus
                      ? "border-[color:var(--mode-review)]/45 bg-surface/90"
                      : "border-border bg-surface/70"
                )}
              >
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
                  <h3 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                    {tier.name}
                  </h3>

                  <div className="mt-5 flex items-end gap-2">
                    <span className="font-display text-5xl font-semibold tracking-[-0.06em]">
                      {tier.id === "free"
                        ? "$0"
                        : formatUsd(tier.priceMonthly)}
                    </span>
                    <span className="pb-1.5 text-sm text-muted">
                      {tier.priceSuffix}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-muted">
                    {tier.blurb}
                  </p>
                </div>

                <div className="relative z-[1] mt-auto pt-6">
                  {tier.id === "free" ? (
                    tier.cta.href ? (
                      <MarketingAuthCta
                        size="sm"
                        magnetic={false}
                        signedOutLabel="Sign in with Google"
                        signedInLabel="Open Dashboard"
                        className="w-full"
                      />
                    ) : null
                  ) : manageInstead ? (
                    <Link
                      href="/settings"
                      className="flex h-10 w-full items-center justify-center rounded-xl border border-border text-sm font-semibold text-foreground transition-colors hover:bg-surface-raised"
                    >
                      Manage in Settings
                    </Link>
                  ) : (
                    <Link
                      href={`/pricing?plan=${tier.id}`}
                      className={cn(
                        "flex h-10 w-full items-center justify-center rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90",
                        isPro
                          ? "bg-[color:var(--mode-listen)]"
                          : "bg-[color:var(--mode-review)]"
                      )}
                    >
                      {tier.cta.label}
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-10 sm:mt-12" data-pricing-intro>
          <PricingComparisonTable />
        </div>

        <p
          data-pricing-intro
          className="mt-6 text-center text-xs text-muted sm:mt-8"
        >
          {copy.note}{" "}
          <Link
            href="/pricing"
            className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
          >
            Full pricing page
          </Link>
        </p>
      </div>
    </section>
  );
}
