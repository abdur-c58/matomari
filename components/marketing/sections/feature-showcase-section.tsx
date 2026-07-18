"use client";

import { useCallback, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MARKETING_DESKTOP_MQ } from "@/components/marketing/motion/easings";
import { revealOnMobile } from "@/components/marketing/motion/mobile-scroll-reveal";
import { useGsapContext } from "@/components/marketing/motion/use-gsap-context";
import { useSmoothScroll } from "@/components/marketing/motion/smooth-scroll-provider";
import { DailyLoopTrial } from "@/components/marketing/trials/daily-loop-trials";
import { marketingDailyLoop } from "@/lib/constants/marketing";
import { StepIllustration } from "@/components/marketing/illustrations/step-illustrations";

gsap.registerPlugin(ScrollTrigger);

type StepType = "meaning" | "shadow" | "recall" | "review";
const stepTypes: StepType[] = ["meaning", "shadow", "recall", "review"];
const STEP_COUNT = marketingDailyLoop.steps.length;
const SHADOW_STEP_INDEX = 1;

function getPose(cardIndex: number, activeIndex: number) {
  const delta = cardIndex - activeIndex;
  if (delta === 0) {
    return { xPercent: -50, z: 0, rotateY: 0, rotateX: 0, scale: 1, opacity: 1 };
  }
  if (delta === -1) {
    return { xPercent: -108, z: -105, rotateY: 32, rotateX: 3, scale: 0.74, opacity: 0.5 };
  }
  if (delta === 1) {
    return { xPercent: 8, z: -105, rotateY: -32, rotateX: 3, scale: 0.74, opacity: 0.5 };
  }
  return {
    xPercent: delta < 0 ? -128 : 28,
    z: -210,
    rotateY: delta < 0 ? 42 : -42,
    rotateX: 5,
    scale: 0.58,
    opacity: 0.06,
  };
}

const journeyStages = ["New", "Understood", "Spoken", "Retrieved", "Retained"];

function SentenceJourney({
  stepIndex,
  accent,
}: {
  stepIndex: number;
  accent: string;
}) {
  const reached = stepIndex + 1;
  return (
    <div className="mt-6 border-t border-border/70 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          Sentence journey
        </p>
        <p className="text-[10px] font-medium" style={{ color: accent }}>
          {journeyStages[reached]}
        </p>
      </div>
      <div className="relative flex justify-between">
        <span className="absolute left-2 right-2 top-2 h-px bg-border" aria-hidden />
        <span
          className="absolute left-2 top-2 h-px origin-left transition-[width] duration-700"
          style={{
            width: `calc(${(reached / (journeyStages.length - 1)) * 100}% - 1rem)`,
            background: accent,
          }}
          aria-hidden
        />
        {journeyStages.map((stage, stageIndex) => (
          <span
            key={stage}
            className="relative z-[1] flex flex-col items-center gap-1 text-[8px] text-muted"
          >
            <span
              className="h-4 w-4 rounded-full border-2 transition-colors duration-500"
              style={{
                borderColor: stageIndex <= reached ? accent : "var(--border)",
                background:
                  stageIndex <= reached ? accent : "var(--surface)",
              }}
            />
            <span className="hidden lg:block">{stage}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function FeatureShowcaseSection() {
  const rootRef = useRef<HTMLElement>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const lenisRef = useRef<ReturnType<typeof useSmoothScroll>["lenis"]>(null);
  const { lenis } = useSmoothScroll();
  const [loopKey, setLoopKey] = useState(0);

  lenisRef.current = lenis;

  const goToStep = useCallback((stepIndex: number) => {
    const root = rootRef.current;
    if (!root) return;

    const clamped = Math.max(0, Math.min(STEP_COUNT - 1, stepIndex));
    const desktop = window.matchMedia(MARKETING_DESKTOP_MQ).matches;
    const st = scrollTriggerRef.current;

    if (desktop && st) {
      const progress = clamped / Math.max(1, STEP_COUNT - 1);
      const y = st.start + (st.end - st.start) * progress;
      const currentLenis = lenisRef.current;
      if (currentLenis) {
        currentLenis.scrollTo(y, { duration: 1.05, force: true });
      } else {
        window.scrollTo({ top: y, behavior: "smooth" });
      }
      return;
    }

    const card = root.querySelector<HTMLElement>(
      `[data-step-card-mobile][data-step-index="${clamped}"]`
    );
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const advanceFrom = useCallback(
    (stepIndex: number) => {
      if (stepIndex >= STEP_COUNT - 1) return;
      goToStep(stepIndex + 1);
    },
    [goToStep]
  );

  const retryShadow = useCallback(() => {
    setLoopKey((value) => value + 1);
    // Let remount settle before scrolling back to listen & shadow.
    window.setTimeout(() => goToStep(SHADOW_STEP_INDEX), 80);
  }, [goToStep]);

  const replayLoop = useCallback(() => {
    setLoopKey((value) => value + 1);
    window.setTimeout(() => goToStep(0), 80);
  }, [goToStep]);

  useGsapContext(rootRef, () => {
    const root = rootRef.current;
    if (!root) return;

    const mm = gsap.matchMedia();
    mm.add(MARKETING_DESKTOP_MQ, () => {
      const stage = root.querySelector<HTMLElement>("[data-step-carousel]");
      const cards = gsap.utils.toArray<HTMLElement>(
        root.querySelectorAll("[data-step-card]")
      );
      const progress = root.querySelector<HTMLElement>("[data-progress-rail]");
      const marker = root.querySelector<HTMLElement>("[data-progress-marker]");
      const progressTrack = root.querySelector<HTMLElement>("[data-progress-track]");
      if (!stage || !cards.length) return;

      stage.dataset.enhanced = "true";

      cards.forEach((card, index) => {
        gsap.set(card, { ...getPose(index, 0), y: 0 });
        card.classList.toggle("is-active", index === 0);
      });
      const readable = cards.map((card) =>
        card.querySelector<HTMLElement>("[data-step-readable]")
      );
      gsap.set(readable, { opacity: 0, y: 8 });
      if (readable[0]) gsap.set(readable[0], { opacity: 1, y: 0 });

      // Longer pin so visitors can actually try the live step demos.
      const dwell = 0.9;
      const move = 0.78;
      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: () => `+=${Math.round(window.innerHeight * 2.35)}`,
          pin: true,
          scrub: 0.4,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const active = Math.min(
              cards.length - 1,
              Math.round(self.progress * (cards.length - 1))
            );
            cards.forEach((card, index) => {
              card.classList.toggle("is-active", index === active);
            });
            if (progress) gsap.set(progress, { scaleX: self.progress });
            if (marker && progressTrack) {
              const travel = Math.max(0, progressTrack.clientWidth - marker.offsetWidth);
              gsap.set(marker, { x: travel * self.progress });
            }
          },
        },
      });

      scrollTriggerRef.current = timeline.scrollTrigger ?? null;

      const addDwell = (activeIndex: number, at: number) => {
        const activeCard = cards[activeIndex];
        const ambient = activeCard.querySelector("[data-step-dwell-motion]");
        if (ambient) {
          timeline.to(
            ambient,
            {
              scale: 1.12,
              rotate: activeIndex % 2 ? 8 : -8,
              duration: dwell,
              ease: "none",
            },
            at
          );
        }
      };

      addDwell(0, 0);

      for (let activeIndex = 1; activeIndex < cards.length; activeIndex += 1) {
        const at = (activeIndex - 1) * (dwell + move) + dwell;
        const previousReadable = readable[activeIndex - 1];
        const nextReadable = readable[activeIndex];

        if (previousReadable) {
          timeline.to(
            previousReadable,
            {
              opacity: 0,
              y: -6,
              duration: move * 0.2,
              ease: "power2.in",
            },
            at
          );
        }

        timeline.to(
          cards,
          {
            xPercent: (index) => getPose(index, activeIndex).xPercent,
            z: (index) => getPose(index, activeIndex).z,
            rotateY: (index) => getPose(index, activeIndex).rotateY,
            rotateX: (index) => getPose(index, activeIndex).rotateX,
            scale: (index) => getPose(index, activeIndex).scale,
            opacity: (index) => getPose(index, activeIndex).opacity,
            y: 0,
            duration: move,
            stagger: 0.02,
            ease: "power2.inOut",
          },
          at
        );

        if (nextReadable) {
          timeline.fromTo(
            nextReadable,
            { opacity: 0, y: 8 },
            {
              opacity: 1,
              y: 0,
              duration: move * 0.28,
              ease: "power3.out",
            },
            at + move * 0.72
          );
        }

        const nextCard = cards[activeIndex];
        const number = nextCard.querySelector("[data-step-num]");
        if (number) {
          timeline.fromTo(
            number,
            { y: 10, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: move * 0.28,
              ease: "power3.out",
            },
            at + move * 0.72
          );
        }

        addDwell(activeIndex, at + move);
      }

      return () => {
        scrollTriggerRef.current = null;
      };
    });

    mm.add("(max-width: 767px)", () => {
      const cards = root.querySelectorAll("[data-step-card-mobile]");
      cards.forEach((card) => {
        const parts = card.querySelectorAll("[data-step-illustration-part]");
        gsap.fromTo(
          [card, ...Array.from(parts)],
          { opacity: 0, y: 22 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.05,
            duration: 0.75,
            ease: "back.out(1.25)",
            scrollTrigger: {
              trigger: card,
              start: "top 82%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });
    });

    revealOnMobile(mm, root, "[data-loop-intro]", {
      y: 18,
      start: "top 86%",
    });

    return () => {
      const stage = root.querySelector<HTMLElement>("[data-step-carousel]");
      if (stage) delete stage.dataset.enhanced;
      scrollTriggerRef.current = null;
      mm.revert();
    };
  }, []);

  return (
    <section
      ref={rootRef}
      id="features"
      className="relative overflow-hidden bg-background"
    >
      <div className="mx-auto flex min-h-0 max-w-[1400px] flex-col justify-center px-4 py-12 sm:px-8 md:min-h-[100svh] md:py-0">
        <div className="relative z-20 max-w-xl md:max-w-lg" data-loop-intro>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            {marketingDailyLoop.eyebrow}
          </p>
          <h2 className="marketing-giant-type mt-3 text-[clamp(1.95rem,5.5vw,4.25rem)] sm:mt-4">
            {marketingDailyLoop.title}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted sm:mt-5 sm:text-base md:text-lg">
            {marketingDailyLoop.body}
          </p>
          <div
            data-progress-track
            className="marketing-progress-track relative mt-8 h-2 w-full rounded-full bg-border"
          >
            <div
              data-progress-rail
              className="marketing-progress-fill absolute inset-0 origin-left scale-x-0 rounded-full"
            />
            <span
              data-progress-marker
              className="marketing-progress-marker absolute left-0 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow-lg"
            />
          </div>
        </div>

        <div
          data-step-carousel
          className="marketing-scene relative mt-10 hidden min-h-[32rem] md:block"
        >
          <div className="absolute inset-0 [transform-style:preserve-3d]">
            {marketingDailyLoop.steps.map((step, index) => (
              <article
                key={step.id}
                data-step-card
                data-step-index={index}
                className="marketing-carousel-card marketing-depth-shell absolute left-1/2 top-1/2 h-[30rem] w-[min(64vw,720px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[1.75rem] border bg-surface shadow-lg"
                style={{
                  "--step-accent": step.accent,
                  borderColor: `color-mix(in srgb, ${step.accent} 62%, var(--border))`,
                } as CSSProperties}
              >
                <div
                  data-step-dwell-motion
                  className="pointer-events-none absolute -inset-10 opacity-70 blur-3xl"
                  aria-hidden
                  style={{
                    background: `radial-gradient(ellipse at 35% 45%, color-mix(in srgb, ${step.accent} 62%, transparent), transparent 65%)`,
                  }}
                />
                <div
                  data-step-readable
                  className="marketing-step-readable relative grid h-full grid-cols-[1.15fr_0.85fr]"
                >
                  <div className="relative z-[2] min-h-0 p-4">
                    <DailyLoopTrial
                      key={loopKey}
                      stepId={step.id}
                      accent={step.accent}
                      onComplete={() => advanceFrom(index)}
                      onRetryShadow={retryShadow}
                      onReplay={replayLoop}
                    />
                  </div>
                  <div className="relative z-[2] flex flex-col justify-center border-l border-border/60 p-7">
                    <span
                      data-step-num
                      className="marketing-step-num marketing-giant-type text-[3.5rem] leading-none text-foreground/15"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p
                      className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
                      style={{ color: step.accent }}
                    >
                      Step {index + 1}
                    </p>
                    <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
                      {step.title}
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed text-foreground/85 lg:text-base">
                      {step.description}
                    </p>
                    <SentenceJourney stepIndex={index} accent={step.accent} />
                    <p className="mt-4 text-xs leading-relaxed text-muted">
                      {step.id === "review"
                        ? "See how a confident sentence returns over time."
                        : "Try the live step on the left — finishing advances automatically."}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:hidden">
          {marketingDailyLoop.steps.map((step, index) => (
            <article
              key={`mobile-${step.id}`}
              data-step-card-mobile
              data-step-index={index}
              className="overflow-hidden rounded-2xl border bg-surface shadow-sm"
              style={{
                borderColor: `color-mix(in srgb, ${step.accent} 58%, var(--border))`,
              }}
            >
              <div className="p-4">
                <div className="mb-4 flex items-start gap-3">
                  <div
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl"
                    style={{
                      background: `linear-gradient(145deg, color-mix(in srgb, ${step.accent} 45%, var(--surface)), var(--surface))`,
                    }}
                  >
                    <span className="marketing-giant-type absolute left-1.5 top-0 text-2xl text-white/80">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <StepIllustration
                      type={stepTypes[index]}
                      className="absolute inset-1 opacity-90"
                    />
                  </div>
                  <div>
                    <p
                      className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                      style={{ color: step.accent }}
                    >
                      Step {index + 1}
                    </p>
                    <h3 className="mt-1 font-display text-xl font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm text-foreground/85">{step.description}</p>
                  </div>
                </div>
                <SentenceJourney stepIndex={index} accent={step.accent} />
                <div className="min-h-[22rem]">
                  <DailyLoopTrial
                    key={loopKey}
                    stepId={step.id}
                    accent={step.accent}
                    onComplete={() => advanceFrom(index)}
                    onRetryShadow={retryShadow}
                    onReplay={replayLoop}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
