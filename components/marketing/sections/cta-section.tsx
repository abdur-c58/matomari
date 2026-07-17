"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MarketingAuthCta } from "@/components/marketing/marketing-auth-cta";
import { MARKETING_DESKTOP_MQ } from "@/components/marketing/motion/easings";
import { useGsapContext } from "@/components/marketing/motion/use-gsap-context";
import { marketingCta } from "@/lib/constants/marketing";

gsap.registerPlugin(ScrollTrigger);

export function CtaSection() {
  const rootRef = useRef<HTMLElement>(null);

  useGsapContext(rootRef, () => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add(MARKETING_DESKTOP_MQ, () => {
      const title = root.querySelector("[data-cta-title]");
      const body = root.querySelector("[data-cta-body]");
      const action = root.querySelector("[data-cta-action]");
      if (title) {
        gsap.fromTo(
          title,
          { y: 50, opacity: 0.3 },
          {
            y: 0,
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top 85%",
              end: "top 45%",
              scrub: 0.5,
            },
          }
        );
      }
      if (body) {
        gsap.fromTo(
          body,
          { y: 30, opacity: 0.2 },
          {
            y: 0,
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top 80%",
              end: "top 50%",
              scrub: 0.65,
            },
          }
        );
      }
      if (action) {
        gsap.fromTo(
          action,
          { y: 24, opacity: 0.25 },
          {
            y: 0,
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top 75%",
              end: "top 50%",
              scrub: 0.7,
            },
          }
        );
      }
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={rootRef} className="relative overflow-hidden px-4 py-24 sm:px-8 md:py-32">
      <div className="marketing-cta-field absolute inset-0" aria-hidden />
      <div className="marketing-hard-stripe absolute inset-x-0 top-0 h-1" aria-hidden />
      <div className="relative mx-auto grid max-w-[1400px] gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-end">
        <div>
          <h2
            data-cta-title
            className="marketing-giant-type max-w-[12ch] text-[clamp(2.4rem,6vw,4.75rem)]"
          >
            {marketingCta.title}
          </h2>
          <p
            data-cta-body
            className="mt-5 max-w-md text-base leading-relaxed text-muted sm:text-lg"
          >
            {marketingCta.body}
          </p>
        </div>
        <div data-cta-action className="md:justify-self-end md:pb-2">
          <MarketingAuthCta
            size="lg"
            signedOutLabel={marketingCta.primaryCta}
            signedInLabel="Open Dashboard"
          />
        </div>
      </div>
    </section>
  );
}
