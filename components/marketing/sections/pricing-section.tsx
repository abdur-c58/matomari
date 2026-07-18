"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MarketingAuthCta } from "@/components/marketing/marketing-auth-cta";
import {
  MARKETING_DESKTOP_MQ,
} from "@/components/marketing/motion/easings";
import { revealOnMobile } from "@/components/marketing/motion/mobile-scroll-reveal";
import { useGsapContext } from "@/components/marketing/motion/use-gsap-context";
import {
  marketingPricingSection,
  marketingPricingTiers,
} from "@/lib/constants/marketing-pricing";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

const tiers = [
  marketingPricingTiers.free,
  marketingPricingTiers.plus,
] as const;

export function PricingSection() {
  const rootRef = useRef<HTMLElement>(null);
  const copy = marketingPricingSection;

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
            rotateY: index === 0 ? 6 : -6,
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

  return (
    // DUMMY PRICING — swap marketingPricingTiers when real billing ships.
    <section
      ref={rootRef}
      id="pricing"
      className="marketing-scene relative px-4 py-14 sm:px-8 md:py-24"
      data-placeholder="pricing-dummy"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="mx-auto max-w-2xl text-center">
          <p
            data-pricing-intro
            className="inline-flex rounded-full border border-border bg-surface/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted"
          >
            {copy.tag}
          </p>
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

        <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-5 md:mt-12 md:grid-cols-2 md:gap-6">
          {tiers.map((tier) => {
            const isPlus = tier.id === "plus";
            return (
              <article
                key={tier.id}
                data-pricing-card
                className={cn(
                  "marketing-depth-shell relative flex flex-col rounded-[1.5rem] border p-5 sm:p-6 md:p-8",
                  isPlus
                    ? "border-[color:var(--mode-listen)] bg-surface shadow-sm"
                    : "border-border bg-surface/70"
                )}
              >
                {isPlus && (
                  <div
                    className="pointer-events-none absolute inset-0 rounded-[1.5rem] opacity-70"
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
                      color: isPlus
                        ? "var(--mode-listen)"
                        : "var(--mode-review)",
                    }}
                  >
                    {tier.eyebrow}
                  </p>
                  <h3 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
                    {tier.name}
                  </h3>

                  <div className="mt-5 flex items-end gap-2">
                    <span className="font-display text-5xl font-semibold tracking-[-0.06em] md:text-6xl">
                      {tier.priceLabel}
                    </span>
                    <span className="pb-1.5 text-sm text-muted">
                      {tier.priceSuffix}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-muted">
                    {tier.blurb}
                  </p>
                </div>

                <ul className="relative z-[1] mt-6 space-y-2.5 border-t border-border pt-5 sm:mt-7 sm:space-y-3 sm:pt-6">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/90"
                    >
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          background: isPlus
                            ? "var(--mode-listen)"
                            : "var(--foreground)",
                        }}
                        aria-hidden
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="relative z-[1] mt-auto pt-6 sm:pt-8">
                  {tier.cta.href ? (
                    <MarketingAuthCta
                      size="sm"
                      magnetic={false}
                      signedOutLabel={tier.cta.label}
                      signedInLabel="Open Dashboard"
                      className="w-full"
                    />
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="flex h-10 w-full cursor-not-allowed items-center justify-center rounded-xl border border-[color:var(--mode-listen)]/35 bg-[color:var(--mode-listen)]/10 text-sm font-semibold text-[color:var(--mode-listen)] opacity-80"
                    >
                      {tier.cta.label}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
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
