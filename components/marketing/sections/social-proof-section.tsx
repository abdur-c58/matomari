"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MARKETING_DESKTOP_MQ } from "@/components/marketing/motion/easings";
import { useGsapContext } from "@/components/marketing/motion/use-gsap-context";
import { marketingSocialProofPlaceholder } from "@/lib/constants/marketing";

gsap.registerPlugin(ScrollTrigger);

export function SocialProofSection() {
  const rootRef = useRef<HTMLElement>(null);
  const copy = marketingSocialProofPlaceholder;

  useGsapContext(rootRef, () => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add(MARKETING_DESKTOP_MQ, () => {
      gsap.fromTo(
        root.querySelector("[data-proof-block]"),
        { rotateY: -8, z: -80, opacity: 0.4 },
        {
          rotateY: 0,
          z: 0,
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
      id="social-proof"
      className="marketing-scene relative px-4 py-16 sm:px-8 md:py-24"
      data-placeholder="social-proof"
    >
      <div className="mx-auto max-w-[1400px]">
        <div
          data-proof-block
          className="marketing-depth-shell relative ml-0 max-w-3xl border border-dashed border-border bg-surface/80 p-6 md:ml-[8%] md:p-10 md:rotate-[-1deg]"
        >
          <p className="inline-flex rounded-full bg-surface-raised px-3 py-1 font-mono text-xs text-muted">
            {copy.tag}
          </p>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            {copy.eyebrow}
          </p>
          <h2 className="mt-3 font-display text-[clamp(1.75rem,3vw,2.75rem)] font-semibold tracking-tight">
            {copy.title}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{copy.body}</p>
        </div>
      </div>
    </section>
  );
}
