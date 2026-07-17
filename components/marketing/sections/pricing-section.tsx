"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MARKETING_DESKTOP_MQ } from "@/components/marketing/motion/easings";
import { useGsapContext } from "@/components/marketing/motion/use-gsap-context";
import { marketingPricingPlaceholder } from "@/lib/constants/marketing";

gsap.registerPlugin(ScrollTrigger);

export function PricingSection() {
  const rootRef = useRef<HTMLElement>(null);
  const copy = marketingPricingPlaceholder;

  useGsapContext(rootRef, () => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add(MARKETING_DESKTOP_MQ, () => {
      gsap.fromTo(
        root.querySelector("[data-pricing-block]"),
        { rotateY: 10, z: -90, x: 40, opacity: 0.35 },
        {
          rotateY: 0,
          z: 0,
          x: 0,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top 80%",
            end: "top 45%",
            scrub: 0.55,
          },
        }
      );
    });
    return () => mm.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      id="pricing"
      className="marketing-scene relative px-4 pb-10 sm:px-8 md:pb-16"
      data-placeholder="pricing"
    >
      <div className="mx-auto flex max-w-[1400px] justify-end">
        <div
          data-pricing-block
          className="marketing-ink-panel marketing-depth-shell w-full max-w-2xl border border-white/10 p-6 shadow-lg md:mr-[-2%] md:p-10 md:rotate-[1deg]"
        >
          <p className="inline-flex rounded-full bg-white/10 px-3 py-1 font-mono text-xs text-white/70">
            {copy.tag}
          </p>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
            {copy.eyebrow}
          </p>
          <h2 className="mt-3 font-display text-[clamp(1.75rem,3vw,2.75rem)] font-semibold tracking-tight">
            {copy.title}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70">{copy.body}</p>
          <p className="mt-3 text-sm text-white/50">{copy.note}</p>
        </div>
      </div>
    </section>
  );
}
