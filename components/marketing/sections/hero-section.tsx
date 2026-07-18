"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import { MarketingAuthCta } from "@/components/marketing/marketing-auth-cta";
import { MARKETING_DESKTOP_MQ, MARKETING_EASE_GSAP } from "@/components/marketing/motion/easings";
import { useGsapContext } from "@/components/marketing/motion/use-gsap-context";
import { usePointerTilt } from "@/components/marketing/motion/use-pointer-tilt";
import { useSmoothScroll } from "@/components/marketing/motion/smooth-scroll-provider";
import { scrollToMarketingSection } from "@/components/marketing/motion/scroll-to-section";
import { APP_NAME } from "@/lib/constants/branding";
import { marketingHero } from "@/lib/constants/marketing";

gsap.registerPlugin(ScrollTrigger);

export function HeroSection() {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { lenis } = useSmoothScroll();

  usePointerTilt(stageRef, { maxX: 8, maxY: 6.5 });

  useGsapContext(rootRef, () => {
    const root = rootRef.current;
    if (!root) return;

    const mm = gsap.matchMedia();

    // Load entrance — all viewports except reduced (hook skips reduced)
    const enter = root.querySelectorAll("[data-hero-enter]");
    gsap.fromTo(
      enter,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 1.05,
        stagger: 0.08,
        ease: MARKETING_EASE_GSAP,
      }
    );

    mm.add(MARKETING_DESKTOP_MQ, () => {
      const scrollRig = root.querySelector<HTMLElement>("[data-scroll-rig]");
      const far = root.querySelectorAll("[data-z='far']");
      const mid = root.querySelectorAll("[data-z='mid']");
      const near = root.querySelectorAll("[data-z='near']");
      const brush = root.querySelector("[data-brush]");

      if (scrollRig) {
        gsap.fromTo(
          scrollRig,
          {
            rotateX: 10,
            rotateY: -16,
            z: -120,
          },
          {
            rotateX: -4,
            rotateY: 7,
            z: 35,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: "bottom top",
              scrub: 0.55,
            },
          }
        );
      }

      if (far.length) {
        gsap.fromTo(
          far,
          { z: -260, y: 0, rotateX: -2 },
          {
            z: -320,
            y: 28,
            rotateX: -5,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: "bottom top",
              scrub: 0.7,
            },
          }
        );
      }
      if (mid.length) {
        gsap.fromTo(
          mid,
          { z: -115, y: 0, rotateY: 10 },
          {
            z: -60,
            y: -12,
            rotateY: -6,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: "bottom top",
              scrub: 0.6,
            },
          }
        );
      }
      if (near.length) {
        gsap.fromTo(
          near,
          { z: 105, y: 18, rotateY: -3 },
          {
            z: 165,
            y: -18,
            rotateY: 4,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: "bottom top",
              scrub: 0.45,
            },
          }
        );
      }
      if (brush) {
        gsap.to(brush, {
          yPercent: 18,
          rotate: -6,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom top",
            scrub: 0.8,
          },
        });
      }
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      id="hero"
      className="marketing-hero relative isolate min-h-[100svh] overflow-hidden"
    >
      <div className="marketing-hero-field absolute inset-0" aria-hidden />
      <div className="marketing-hero-grain absolute inset-0" aria-hidden />

      <span
        data-brush
        className="marketing-brush-anchor absolute -right-6 top-24 text-[clamp(6rem,28vw,14rem)] text-foreground/[0.1] md:right-8 md:top-20"
        aria-hidden
      >
        {marketingHero.brandJp}
      </span>

      <div className="relative mx-auto grid max-w-[1400px] gap-8 px-4 pb-10 pt-[calc(5.5rem+env(safe-area-inset-top,0px))] sm:px-8 md:min-h-[100svh] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center md:gap-3 md:py-24 md:pt-24">
        <div>
          <p
            data-hero-enter
            className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted"
          >
            {marketingHero.eyebrow}
          </p>
          <p
            data-hero-enter
            className="mt-6 font-display text-sm font-medium tracking-wide text-muted"
          >
            {APP_NAME}
          </p>
          <h1
            data-hero-enter
            className="marketing-giant-type mt-3 max-w-[14ch] text-[clamp(2.35rem,8vw,5.5rem)] text-foreground"
          >
            {marketingHero.title}
          </h1>
          <p
            data-hero-enter
            className="mt-4 max-w-md text-sm leading-relaxed text-muted sm:mt-6 sm:text-base md:text-lg"
          >
            {marketingHero.subtitle}
          </p>
          <div data-hero-enter className="mt-7 flex flex-wrap items-center gap-3 sm:mt-9">
            <MarketingAuthCta
              size="lg"
              signedOutLabel={marketingHero.primaryCta}
              signedInLabel="Open Dashboard"
            />
            <Button
              size="lg"
              variant="secondary"
              onClick={() => scrollToMarketingSection("features", lenis)}
            >
              {marketingHero.secondaryCta}
            </Button>
          </div>
        </div>

        <div
          ref={stageRef}
          data-hero-visual
          className="marketing-scene marketing-hero-model relative mx-[-1rem] translate-y-4 md:mx-0 md:translate-x-8 md:translate-y-[9rem] md:scale-[1.08] lg:translate-x-12 lg:scale-[1.12]"
        >
          <div data-scroll-rig className="marketing-scroll-rig will-change-transform">
            <div data-pointer-rig className="marketing-pointer-rig">
              <div className="marketing-depth relative min-h-[22rem] md:min-h-[30rem]">
                <div
                  className="marketing-hero-model-glow pointer-events-none absolute inset-[8%_4%_-2%_10%] rounded-[45%] blur-3xl"
                  aria-hidden
                />
                {/* Far layer */}
                <div
                  data-z="far"
                  className="marketing-depth-shell absolute left-4 top-8 w-[72%] rounded-2xl border border-border bg-surface p-4 shadow-lg md:left-0 md:w-[70%]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--mode-listen)]">
                    Listen &amp; shadow
                  </p>
                  <p className="mt-3 font-japanese text-2xl text-foreground">水が必要です。</p>
                  <div className="mt-4 flex h-10 items-end gap-0.5">
                    {Array.from({ length: 28 }).map((_, i) => (
                      <span
                        key={i}
                        className="flex-1 rounded-sm bg-[color:var(--mode-listen)]/50"
                        style={{ height: `${30 + ((i * 37) % 70)}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Mid layer */}
                <div
                  data-z="mid"
                  className="marketing-depth-shell absolute right-2 top-24 w-[70%] rounded-2xl border border-border bg-surface p-5 shadow-lg md:right-0 md:top-32 md:w-[64%]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--mode-recall)]">
                    Active recall
                  </p>
                  <p className="mt-3 text-sm text-muted">I need water.</p>
                  <p className="mt-4 font-japanese text-xl text-foreground">水が必要です。</p>
                </div>

                {/* Near layer */}
                <div
                  data-z="near"
                  className="marketing-ink-panel marketing-depth-shell absolute bottom-2 left-[12%] w-[78%] rounded-2xl border border-white/20 p-5 shadow-xl md:bottom-0 md:left-[16%] md:w-[62%] md:p-6"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                    Dashboard
                  </p>
                  <p className="mt-2 font-display text-lg font-semibold">Your study plan for today.</p>
                  <div className="mt-4 flex gap-2">
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px]">Meaning</span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px]">Shadow</span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px]">Recall</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
