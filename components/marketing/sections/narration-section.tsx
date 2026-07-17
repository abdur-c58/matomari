"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MARKETING_DESKTOP_MQ } from "@/components/marketing/motion/easings";
import { useGsapContext } from "@/components/marketing/motion/use-gsap-context";
import { NarrationTrial } from "@/components/marketing/trials/narration-trial";
import { marketingNarration } from "@/lib/constants/marketing";

gsap.registerPlugin(ScrollTrigger);

const ACCENT = "var(--mode-listen)";

export function NarrationSection() {
  const rootRef = useRef<HTMLElement>(null);

  useGsapContext(rootRef, () => {
    const root = rootRef.current;
    if (!root) return;

    const mm = gsap.matchMedia();
    mm.add(MARKETING_DESKTOP_MQ, () => {
      const copy = root.querySelector("[data-narration-copy]");
      const trial = root.querySelector("[data-narration-trial]");

      if (copy) {
        gsap.fromTo(
          copy,
          { y: 48, opacity: 0.3 },
          {
            y: 0,
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top 80%",
              end: "top 40%",
              scrub: 0.5,
            },
          }
        );
      }

      if (trial) {
        gsap.fromTo(
          trial,
          { y: 36, opacity: 0.2, rotateX: 4 },
          {
            y: 0,
            opacity: 1,
            rotateX: 0,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top 78%",
              end: "top 42%",
              scrub: 0.55,
            },
          }
        );
      }
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      id="narration"
      className="relative overflow-hidden bg-background px-4 py-20 sm:px-8 md:py-28"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-60"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at 70% 0%, color-mix(in srgb, var(--mode-listen) 18%, transparent), transparent 70%)",
        }}
      />

      <div className="relative mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-14">
        <div data-narration-copy className="max-w-xl min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            {marketingNarration.eyebrow}
          </p>
          <h2 className="marketing-giant-type mt-4 text-[clamp(2.1rem,5vw,3.75rem)]">
            {marketingNarration.title}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
            {marketingNarration.body}
          </p>

          <ul className="mt-7 space-y-3">
            {marketingNarration.points.map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 text-sm leading-relaxed text-foreground/85"
              >
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: ACCENT }}
                  aria-hidden
                />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div
          data-narration-trial
          className="marketing-scene relative min-h-[40rem] min-w-0"
        >
          <div
            className="pointer-events-none absolute -inset-8 opacity-70 blur-3xl"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse at 50% 40%, color-mix(in srgb, var(--mode-listen) 34%, transparent), transparent 68%)",
            }}
          />
          <div className="relative h-full min-h-[40rem] min-w-0">
            <NarrationTrial accent={ACCENT} />
          </div>
        </div>
      </div>
    </section>
  );
}
