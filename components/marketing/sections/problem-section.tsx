"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MARKETING_DESKTOP_MQ, MARKETING_Z } from "@/components/marketing/motion/easings";
import { useGsapContext } from "@/components/marketing/motion/use-gsap-context";
import { usePointerTilt } from "@/components/marketing/motion/use-pointer-tilt";
import { marketingProblem } from "@/lib/constants/marketing";

gsap.registerPlugin(ScrollTrigger);

const cardMotion = [
  { fromX: -18, fromY: 10, fromZ: MARKETING_Z.far, x: "-8%", y: "8%" },
  { fromX: 12, fromY: -14, fromZ: MARKETING_Z.mid, x: "18%", y: "28%" },
  { fromX: -8, fromY: 16, fromZ: MARKETING_Z.far - 20, x: "52%", y: "52%" },
] as const;

const highlightPhrase = "can you say it when you need it?";
const problemBodyLead = marketingProblem.body.slice(0, -highlightPhrase.length);

export function ProblemSection() {
  const rootRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  usePointerTilt(sceneRef, { maxX: 5, maxY: 4 });

  useGsapContext(rootRef, () => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();

    const highlight = root.querySelector("[data-problem-highlight]");
    const highlightReveal = root.querySelector<HTMLElement>(
      "[data-problem-highlight-reveal]"
    );

    // Clip-reveal draws the full brush mark in — no scaleX stretch distortion.
    if (highlight && highlightReveal) {
      gsap.fromTo(
        highlightReveal,
        { clipPath: "inset(0 100% 0 0)" },
        {
          clipPath: "inset(0 0% 0 0)",
          ease: "none",
          scrollTrigger: {
            trigger: highlight,
            start: "top 82%",
            end: "top 52%",
            scrub: 0.4,
          },
        }
      );
    }

    mm.add(MARKETING_DESKTOP_MQ, () => {
      const cards = root.querySelectorAll<HTMLElement>("[data-problem-card]");
      const title = root.querySelector("[data-problem-title]");
      const body = root.querySelector("[data-problem-body]");

      if (title) {
        gsap.fromTo(
          title,
          { y: 60, opacity: 0.35 },
          {
            y: 0,
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top 80%",
              end: "top 30%",
              scrub: 0.5,
            },
          }
        );
      }
      if (body) {
        gsap.fromTo(
          body,
          { y: 40, opacity: 0.2 },
          {
            y: 0,
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top 75%",
              end: "top 35%",
              scrub: 0.65,
            },
          }
        );
      }

      cards.forEach((card, index) => {
        const motion = cardMotion[index] ?? cardMotion[0];
        gsap.fromTo(
          card,
          {
            opacity: 0.15,
            rotateX: motion.fromX,
            rotateY: motion.fromY,
            z: motion.fromZ,
          },
          {
            opacity: 1,
            rotateX: 0,
            rotateY: 0,
            z: index === 1 ? MARKETING_Z.near : 20,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top 70%",
              end: "center 40%",
              scrub: 0.55,
            },
          }
        );
      });
    });

    // Mobile: bold but simpler 3D-lite entrances
    mm.add("(max-width: 767px)", () => {
      const cards = root.querySelectorAll("[data-problem-card]");
      gsap.fromTo(
        cards,
        { opacity: 0, y: 28, rotateX: 8 },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          stagger: 0.12,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: {
            trigger: root,
            start: "top 78%",
            toggleActions: "play none none reverse",
          },
        }
      );
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      id="problem"
      className="relative overflow-hidden py-20 md:py-32"
    >
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 sm:px-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:gap-6">
        <div className="md:sticky md:top-28 md:self-start">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            {marketingProblem.eyebrow}
          </p>
          <h2
            data-problem-title
            className="marketing-giant-type mt-5 max-w-[12ch] text-[clamp(2.4rem,6vw,4.75rem)] text-foreground"
          >
            {marketingProblem.title}
          </h2>
          <p
            data-problem-body
            className="mt-6 max-w-md text-base leading-relaxed text-muted sm:text-lg"
          >
            {problemBodyLead}
            <span
              data-problem-highlight
              className="marketing-hand-highlight relative inline-block whitespace-nowrap text-foreground"
            >
              <span
                data-problem-highlight-reveal
                className="marketing-hand-highlight-reveal"
                aria-hidden
              >
                <span className="marketing-hand-highlight-stroke" />
                <span className="marketing-hand-highlight-bristle" />
              </span>
              <span className="relative z-[1]">{highlightPhrase}</span>
            </span>
          </p>
        </div>

        <div
          ref={sceneRef}
          className="marketing-scene relative min-h-[28rem] md:min-h-[34rem]"
        >
          <div data-pointer-rig className="marketing-pointer-rig h-full">
            <div className="relative flex flex-col gap-4 md:block md:h-full">
              {marketingProblem.cards.map((card, index) => {
                const motion = cardMotion[index];
                return (
                  <article
                    key={card.label}
                    data-problem-card
                    className="marketing-depth-shell rounded-2xl border border-border bg-surface p-5 shadow-md md:absolute md:w-[68%] md:p-6"
                    style={
                      motion
                        ? {
                            left: motion.x,
                            top: motion.y,
                          }
                        : undefined
                    }
                  >
                    <span
                      className="mb-4 block h-1 w-12"
                      style={{
                        background:
                          index === 0
                            ? "var(--mode-meaning)"
                            : index === 1
                              ? "var(--mode-listen)"
                              : "var(--mode-weak)",
                      }}
                    />
                    <h3 className="font-display text-xl font-semibold tracking-tight md:text-2xl">
                      {card.label}
                    </h3>
                    <p className="mt-2 text-sm text-muted">{card.detail}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
