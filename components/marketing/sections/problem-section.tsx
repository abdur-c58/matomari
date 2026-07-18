"use client";

import { useRef } from "react";
import { ChevronDown } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  MARKETING_DESKTOP_MQ,
  MARKETING_EASE_GSAP,
  MARKETING_REDUCED_MQ,
} from "@/components/marketing/motion/easings";
import {
  MARKETING_MOBILE_MQ,
  revealOnMobile,
} from "@/components/marketing/motion/mobile-scroll-reveal";
import { useGsapContext } from "@/components/marketing/motion/use-gsap-context";
import { marketingProblem } from "@/lib/constants/marketing";
import { cn } from "@/lib/utils";
import { playMarketingCursorAudio } from "@/components/marketing/motion/marketing-cursor-audio";

gsap.registerPlugin(ScrollTrigger);

const highlightPhrase = "be ready to say it when it counts.";
const problemBodyLead = marketingProblem.body.slice(0, -highlightPhrase.length);
const { gapDemo } = marketingProblem;
const STAGE_COUNT = gapDemo.stages.length;

/** Relative scroll weight per beat inside one stage (sums to 1). */
const BEAT = {
  confidence: 0.2,
  moment: 0.2,
  gap: 0.28,
  reveal: 0.32,
} as const;

function splitWords(text: string) {
  return text.split(/(\s+)/).filter((part) => part.length > 0);
}

function playJapaneseAudio(src: string, fallbackText: string) {
  playMarketingCursorAudio(src, fallbackText);
}

function WordLine({
  text,
  line,
  className,
}: {
  text: string;
  line: "confidence" | "moment" | "gap" | "payoff" | "closing";
  className?: string;
}) {
  return (
    <p
      data-gap-line={line}
      className={cn("mx-auto m-0 w-full text-center", className)}
      aria-hidden
    >
      {splitWords(text).map((part, index) => {
        if (/^\s+$/.test(part)) {
          return <span key={`${line}-s-${index}`}>{part}</span>;
        }
        return (
          <span
            key={`${line}-w-${index}`}
            data-gap-word
            className="inline-block opacity-0 will-change-transform"
          >
            {part}
          </span>
        );
      })}
    </p>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-5 w-5", className)}
      aria-hidden
      fill="none"
    >
      <rect
        data-gap-check-box
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        data-gap-check-mark
        d="M7.2 12.2 10.4 15.4 16.8 8.6"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function revealWords(
  tl: gsap.core.Timeline,
  words: HTMLElement[],
  at: number,
  duration: number,
  stagger: number,
  ease: string
) {
  if (!words.length) return;
  tl.to(
    words,
    {
      opacity: 1,
      y: 0,
      stagger,
      duration,
      ease,
    },
    at
  );
  // Scrub can leave later staggered words mid-fade — lock full visibility
  // once the reveal window should be complete.
  const completeAt = at + duration + stagger * Math.max(0, words.length - 1);
  tl.set(words, { opacity: 1, y: 0 }, completeAt);
}

export function ProblemSection() {
  const rootRef = useRef<HTMLElement>(null);

  useGsapContext(
    rootRef,
    () => {
      const root = rootRef.current;
      if (!root) return;
      const mm = gsap.matchMedia();

      const highlight = root.querySelector("[data-problem-highlight]");
      const highlightReveal = root.querySelector<HTMLElement>(
        "[data-problem-highlight-reveal]"
      );

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

      const stageRoot = root.querySelector<HTMLElement>("[data-gap-stage]");
      const stageBlocks = gsap.utils.toArray<HTMLElement>(
        root.querySelectorAll("[data-gap-stage-block]")
      );
      const items = gsap.utils.toArray<HTMLElement>(
        root.querySelectorAll("[data-gap-item]")
      );
      const closingLines = gsap.utils.toArray<HTMLElement>(
        root.querySelectorAll("[data-gap-closing-line]")
      );
      const closingWords = gsap.utils.toArray<HTMLElement>(
        root.querySelectorAll("[data-gap-closing-line] [data-gap-word]")
      );

      const stages = stageBlocks.map((block, index) => {
        const confidence = block.querySelector<HTMLElement>(
          '[data-gap-line="confidence"]'
        );
        const moment = block.querySelector<HTMLElement>(
          '[data-gap-line="moment"]'
        );
        const gap = block.querySelector<HTMLElement>('[data-gap-line="gap"]');
        const real = block.querySelector<HTMLElement>('[data-gap-line="real"]');
        const payoff = block.querySelector<HTMLElement>(
          '[data-gap-line="payoff"]'
        );
        return {
          index,
          block,
          confidence,
          moment,
          gap,
          real,
          payoff,
          confidenceWords: gsap.utils.toArray<HTMLElement>(
            confidence?.querySelectorAll("[data-gap-word]") ?? []
          ),
          momentWords: gsap.utils.toArray<HTMLElement>(
            moment?.querySelectorAll("[data-gap-word]") ?? []
          ),
          gapWords: gsap.utils.toArray<HTMLElement>(
            gap?.querySelectorAll("[data-gap-word]") ?? []
          ),
          payoffWords: gsap.utils.toArray<HTMLElement>(
            payoff?.querySelectorAll("[data-gap-word]") ?? []
          ),
          item: items[index] ?? null,
          checkMark: items[index]?.querySelector<SVGPathElement>(
            "[data-gap-check-mark]"
          ),
          checkBox: items[index]?.querySelector<SVGRectElement>(
            "[data-gap-check-box]"
          ),
        };
      });

      const setItemState = (
        stage: (typeof stages)[number],
        state: "idle" | "active" | "done"
      ) => {
        if (!stage.item) return;
        if (state === "idle") {
          gsap.set(stage.item, {
            opacity: 0.36,
            scale: 1,
            attr: { "data-active": "false", "data-done": "false" },
          });
          gsap.set(stage.checkMark, {
            opacity: 0,
            scale: 0.45,
            transformOrigin: "50% 50%",
          });
          gsap.set(stage.checkBox, { opacity: 0.4 });
        } else if (state === "active") {
          gsap.set(stage.item, {
            opacity: 1,
            scale: 1.03,
            attr: { "data-active": "true", "data-done": "false" },
          });
          gsap.set(stage.checkBox, { opacity: 1 });
        } else {
          gsap.set(stage.item, {
            opacity: 1,
            scale: 1,
            attr: { "data-active": "false", "data-done": "true" },
          });
          gsap.set(stage.checkMark, {
            opacity: 1,
            scale: 1,
            transformOrigin: "50% 50%",
          });
          gsap.set(stage.checkBox, { opacity: 1 });
        }
      };

      const hideStageContent = (stage: (typeof stages)[number]) => {
        gsap.set(stage.block, { autoAlpha: 0 });
        gsap.set(
          [
            ...stage.confidenceWords,
            ...stage.momentWords,
            ...stage.gapWords,
            ...stage.payoffWords,
          ],
          { opacity: 0, y: 12 }
        );
        if (stage.confidence) {
          gsap.set(stage.confidence, {
            opacity: 1,
            scale: 1,
            height: "auto",
            overflow: "visible",
          });
        }
        if (stage.moment) {
          gsap.set(stage.moment, {
            opacity: 1,
            y: 0,
            height: 0,
            overflow: "hidden",
            marginTop: 0,
            marginBottom: 0,
          });
        }
        if (stage.gap) {
          gsap.set(stage.gap, {
            opacity: 1,
            x: 0,
            height: 0,
            overflow: "hidden",
            marginTop: 0,
            marginBottom: 0,
          });
        }
        if (stage.real) {
          gsap.set(stage.real, {
            opacity: 0,
            scale: 0.88,
            y: 16,
            height: 0,
            overflow: "hidden",
            marginTop: 0,
            marginBottom: 0,
          });
        }
        if (stage.payoff) {
          gsap.set(stage.payoff, {
            opacity: 1,
            height: 0,
            overflow: "hidden",
            marginTop: 0,
            marginBottom: 0,
          });
        }
      };

      const setIdleState = () => {
        stages.forEach((stage, index) => {
          hideStageContent(stage);
          if (index === 0) gsap.set(stage.block, { autoAlpha: 1 });
          setItemState(stage, "idle");
        });
        gsap.set(closingLines, { autoAlpha: 0 });
        gsap.set(closingWords, { opacity: 0, y: 10 });
      };

      const setFinalState = () => {
        stages.forEach((stage, index) => {
          hideStageContent(stage);
          if (index === STAGE_COUNT - 1) {
            gsap.set(stage.block, { autoAlpha: 1 });
            if (stage.confidence) {
              gsap.set(stage.confidence, { height: 0, opacity: 0, overflow: "hidden" });
            }
            if (stage.moment) {
              gsap.set(stage.moment, { height: 0, opacity: 0, overflow: "hidden" });
            }
            if (stage.gap) {
              gsap.set(stage.gap, { height: 0, opacity: 0, overflow: "hidden" });
            }
            if (stage.real) {
              gsap.set(stage.real, {
                opacity: 1,
                scale: 1,
                y: 0,
                height: "auto",
                overflow: "visible",
                marginTop: 8,
                marginBottom: 8,
              });
            }
            if (stage.payoff) {
              gsap.set(stage.payoff, {
                height: "auto",
                overflow: "visible",
                marginTop: 4,
                marginBottom: 4,
              });
            }
            gsap.set(stage.payoffWords, { opacity: 1, y: 0 });
          }
          setItemState(stage, "done");
        });
        gsap.set(closingLines, { autoAlpha: 0 });
        gsap.set(closingWords, { opacity: 0, y: 0 });
        const lastClosing = closingLines[closingLines.length - 1];
        if (lastClosing) {
          gsap.set(lastClosing, { autoAlpha: 1 });
          gsap.set(lastClosing.querySelectorAll("[data-gap-word]"), {
            opacity: 1,
            y: 0,
          });
        }
      };

      const buildFullTimeline = (motion: "full" | "simple") => {
        const tl = gsap.timeline({ defaults: { ease: "none" } });
        const spring = motion === "full" ? "back.out(1.7)" : "power2.out";
        const wordEase = motion === "full" ? MARKETING_EASE_GSAP : "power1.out";
        const gapShake = motion === "full";
        // Room for full word reveals + readable holds under scrub.
        const STAGE_DUR = 7;

        stages.forEach((stage, stageIndex) => {
          const stageStart = tl.duration();
          const confDur = STAGE_DUR * BEAT.confidence;
          const momDur = STAGE_DUR * BEAT.moment;
          const gapDur = STAGE_DUR * BEAT.gap;
          const revDur = STAGE_DUR * BEAT.reveal;

          const confAt = stageStart;
          const momAt = stageStart + confDur;
          const gapAt = stageStart + confDur + momDur;
          const revAt = stageStart + confDur + momDur + gapDur;
          const stageEnd = stageStart + STAGE_DUR;

          // Bring this stage forward; hide others.
          stages.forEach((other, otherIndex) => {
            tl.set(
              other.block,
              { autoAlpha: otherIndex === stageIndex ? 1 : 0 },
              stageStart
            );
          });

          // Reset this stage's lines for a clean entrance.
          tl.set(
            [
              ...stage.confidenceWords,
              ...stage.momentWords,
              ...stage.gapWords,
              ...stage.payoffWords,
            ],
            { opacity: 0, y: 12 },
            stageStart
          );
          if (stage.confidence) {
            tl.set(stage.confidence, { opacity: 1, scale: 1, height: "auto" }, stageStart);
          }
          if (stage.moment) {
            tl.set(
              stage.moment,
              {
                opacity: 1,
                y: 0,
                height: 0,
                overflow: "hidden",
                marginTop: 0,
                marginBottom: 0,
              },
              stageStart
            );
          }
          if (stage.gap) {
            tl.set(
              stage.gap,
              {
                opacity: 1,
                x: 0,
                height: 0,
                overflow: "hidden",
                marginTop: 0,
                marginBottom: 0,
              },
              stageStart
            );
          }
          if (stage.real) {
            tl.set(
              stage.real,
              {
                opacity: 0,
                scale: 0.88,
                y: 16,
                height: 0,
                overflow: "hidden",
                marginTop: 0,
                marginBottom: 0,
              },
              stageStart
            );
          }
          if (stage.payoff) {
            tl.set(
              stage.payoff,
              {
                opacity: 1,
                height: 0,
                overflow: "hidden",
                marginTop: 0,
                marginBottom: 0,
              },
              stageStart
            );
          }

          // Activate checklist row for this stage.
          if (stage.item) {
            tl.set(
              stage.item,
              { attr: { "data-active": "true", "data-done": "false" } },
              stageStart
            );
            tl.to(
              stage.item,
              { opacity: 1, scale: 1.03, duration: 0.25, ease: "power2.out" },
              stageStart
            );
            if (stage.checkBox) {
              tl.to(
                stage.checkBox,
                { opacity: 1, duration: 0.2, ease: "power2.out" },
                stageStart
              );
            }
          }

          // 1) CONFIDENCE — reveal early, then hold so every word is readable
          revealWords(
            tl,
            stage.confidenceWords,
            confAt + confDur * 0.04,
            confDur * (motion === "full" ? 0.38 : 0.3),
            motion === "full" ? 0.028 : 0.014,
            wordEase
          );

          // 2) MOMENT — confidence recedes; moment takes focus (quicker)
          if (stage.confidence) {
            tl.to(
              stage.confidence,
              {
                opacity: 0.28,
                scale: 0.94,
                duration: momDur * 0.4,
                ease: "power2.inOut",
              },
              momAt
            );
          }
          if (stage.moment) {
            tl.set(
              stage.moment,
              {
                height: "auto",
                overflow: "visible",
                marginTop: 6,
                marginBottom: 6,
              },
              momAt
            );
          }
          revealWords(
            tl,
            stage.momentWords,
            momAt + momDur * 0.06,
            momDur * (motion === "full" ? 0.34 : 0.26),
            motion === "full" ? 0.024 : 0.012,
            wordEase
          );

          // 3) GAP — short pause, quick full reveal, long readable hold
          // (this line was getting cleared mid-stagger under scrub)
          const gapPause = gapDur * 0.18;
          const gapRevealAt = gapAt + gapPause;
          const gapAnimDur = gapDur * 0.28;
          tl.to({}, { duration: gapPause }, gapAt);
          if (stage.gap) {
            tl.set(
              stage.gap,
              {
                height: "auto",
                overflow: "visible",
                marginTop: 6,
                marginBottom: 6,
              },
              gapRevealAt
            );
          }
          revealWords(
            tl,
            stage.gapWords,
            gapRevealAt,
            gapAnimDur,
            motion === "full" ? 0.016 : 0.01,
            wordEase
          );
          // Extra hard snap mid-hold so the full sentence is on screen
          // well before the English lines clear for the Japanese reveal.
          tl.set(
            stage.gapWords,
            { opacity: 1, y: 0 },
            gapRevealAt + gapAnimDur + 0.05
          );
          if (stage.gap) {
            tl.set(stage.gap, { opacity: 1 }, gapRevealAt + gapAnimDur + 0.05);
          }
          if (stage.gap && gapShake) {
            tl.fromTo(
              stage.gap,
              { x: -3 },
              { x: 0, duration: gapDur * 0.14, ease: "power2.out" },
              gapRevealAt
            );
          }

          // 4) REAL + PAYOFF — only clear English after gap has fully landed
          const clearAt = revAt + revDur * 0.08;
          if (stage.confidence) {
            tl.to(
              stage.confidence,
              {
                opacity: 0,
                height: 0,
                marginTop: 0,
                marginBottom: 0,
                overflow: "hidden",
                duration: revDur * 0.14,
                ease: "power2.in",
              },
              clearAt
            );
          }
          if (stage.moment) {
            tl.to(
              stage.moment,
              {
                opacity: 0,
                height: 0,
                marginTop: 0,
                marginBottom: 0,
                overflow: "hidden",
                duration: revDur * 0.14,
                ease: "power2.in",
              },
              clearAt
            );
          }
          if (stage.gap) {
            tl.to(
              stage.gap,
              {
                opacity: 0,
                height: 0,
                marginTop: 0,
                marginBottom: 0,
                overflow: "hidden",
                duration: revDur * 0.14,
                ease: "power2.in",
              },
              clearAt
            );
          }

          if (stage.real) {
            tl.set(
              stage.real,
              {
                height: "auto",
                overflow: "visible",
                marginTop: 10,
                marginBottom: 10,
              },
              revAt + revDur * 0.12
            );
            tl.to(
              stage.real,
              {
                opacity: 1,
                scale: 1,
                y: 0,
                duration: revDur * (motion === "full" ? 0.32 : 0.24),
                ease: spring,
              },
              revAt + revDur * 0.14
            );
          }

          // Checklist checks when real phrase finishes entrance.
          const checkAt = revAt + revDur * 0.46;
          if (stage.checkMark) {
            tl.to(
              stage.checkMark,
              {
                opacity: 1,
                scale: 1,
                duration: revDur * (motion === "full" ? 0.22 : 0.14),
                ease: spring,
              },
              checkAt
            );
          }
          if (stage.item) {
            tl.set(
              stage.item,
              { attr: { "data-active": "false", "data-done": "true" } },
              checkAt
            );
            tl.to(
              stage.item,
              { scale: 1, duration: revDur * 0.14, ease: "power2.out" },
              checkAt
            );
          }

          if (stage.payoff) {
            tl.set(
              stage.payoff,
              {
                height: "auto",
                overflow: "visible",
                marginTop: 6,
                marginBottom: 6,
              },
              revAt + revDur * 0.48
            );
          }
          revealWords(
            tl,
            stage.payoffWords,
            revAt + revDur * 0.5,
            revDur * (motion === "full" ? 0.22 : 0.16),
            motion === "full" ? 0.022 : 0.012,
            wordEase
          );

          // Pad to exact stage end so beat weights stay proportional under scrub.
          tl.to({}, { duration: Math.max(0.01, stageEnd - tl.duration()) }, tl.duration());

          // Soft exit before next stage (keep last stage visible into closing).
          if (stageIndex < STAGE_COUNT - 1) {
            tl.to(stage.block, {
              autoAlpha: 0,
              duration: 0.45,
              ease: "power2.inOut",
            });
            if (stage.item) {
              tl.to(
                stage.item,
                { opacity: 0.78, duration: 0.25, ease: "power2.out" },
                "<"
              );
            }
          }
        });

        // Closing — one line at a time; previous line exits before the next enters
        closingLines.forEach((line, lineIndex) => {
          const lineWords = gsap.utils.toArray<HTMLElement>(
            line.querySelectorAll("[data-gap-word]")
          );
          const lineAt = tl.duration() + (lineIndex === 0 ? 0.08 : 0.2);

          if (lineIndex > 0) {
            const prev = closingLines[lineIndex - 1];
            const prevWords = gsap.utils.toArray<HTMLElement>(
              prev.querySelectorAll("[data-gap-word]")
            );
            tl.to(
              prevWords,
              {
                opacity: 0,
                y: -8,
                stagger: 0.01,
                duration: motion === "full" ? 0.28 : 0.18,
                ease: "power2.in",
              },
              lineAt
            );
            tl.to(
              prev,
              { autoAlpha: 0, duration: 0.2, ease: "power2.in" },
              lineAt + 0.12
            );
          }

          tl.to(line, { autoAlpha: 1, duration: 0.01 }, lineAt + (lineIndex > 0 ? 0.22 : 0));
          revealWords(
            tl,
            lineWords,
            lineAt + (lineIndex > 0 ? 0.26 : 0.04),
            motion === "full" ? 0.55 : 0.36,
            motion === "full" ? 0.028 : 0.014,
            wordEase
          );
          // Readable hold before the next line (or after the last).
          tl.to({}, { duration: motion === "full" ? 0.85 : 0.55 });
        });
        tl.to({}, { duration: 0.6 });

        return tl;
      };

      mm.add(
        `${MARKETING_DESKTOP_MQ} and (prefers-reduced-motion: no-preference)`,
        () => {
          if (!stageRoot || !stages.length) return;
          setIdleState();
          const tl = buildFullTimeline("full");
          ScrollTrigger.create({
            trigger: stageRoot,
            start: "top top",
            end: () =>
              `+=${Math.round(window.innerHeight * (1.45 + STAGE_COUNT * 1.2 + 1.1))}`,
            pin: true,
            scrub: 0.55,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            animation: tl,
          });
        }
      );

      mm.add(
        `${MARKETING_MOBILE_MQ} and (prefers-reduced-motion: no-preference)`,
        () => {
          if (!stageRoot || !stages.length) return;
          setIdleState();
          const tl = buildFullTimeline("full");
          ScrollTrigger.create({
            trigger: stageRoot,
            start: "top 68%",
            toggleActions: "play none none reverse",
            animation: tl,
          });
        }
      );

      mm.add(MARKETING_REDUCED_MQ, () => {
        if (!stageRoot || !stages.length) {
          setFinalState();
          return;
        }
        setIdleState();
        const tl = buildFullTimeline("simple");
        ScrollTrigger.create({
          trigger: stageRoot,
          start: "top 72%",
          toggleActions: "play none none reverse",
          animation: tl,
        });
      });

      mm.add(MARKETING_DESKTOP_MQ, () => {
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
      });

      revealOnMobile(
        mm,
        root,
        "[data-problem-title], [data-problem-body], [data-problem-bridge]",
        {
          y: 18,
          stagger: 0.08,
          start: "top 86%",
        }
      );

      return () => mm.revert();
    },
    [],
    { force: true }
  );

  return (
    <section
      ref={rootRef}
      id="problem"
      className="relative overflow-x-hidden py-14 md:py-28"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            {marketingProblem.eyebrow}
          </p>
          <h2
            data-problem-title
            className="marketing-giant-type mx-auto mt-4 max-w-[22ch] text-center text-[clamp(2.1rem,6.5vw,4.75rem)] text-foreground sm:mt-5"
          >
            {marketingProblem.title}
          </h2>
          <p
            data-problem-body
            className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted sm:mt-6 sm:text-base md:text-lg"
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

          <div
            data-problem-bridge
            className="marketing-scroll-cue mx-auto mt-10 flex flex-col items-center gap-3 sm:mt-12"
          >
            <p className="font-display text-base font-medium tracking-tight text-foreground sm:text-lg">
              {gapDemo.bridge}
            </p>
            <span
              className="flex flex-col items-center gap-1 text-muted"
              aria-hidden
            >
              <span
                className="marketing-scroll-cue-mouse relative flex h-8 w-5 justify-center rounded-full border border-border"
              >
                <span
                  className="marketing-scroll-cue-dot mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground/70"
                />
              </span>
              <ChevronDown className="marketing-scroll-cue-chevron h-4 w-4" />
            </span>
          </div>
        </div>
      </div>

      {/*
        Pin this FULL-WIDTH shell. Do not put mx-auto/max-width on the pinned
        element — ScrollTrigger fixed positioning breaks auto-margin centering.
      */}
      <div
        data-gap-stage
        className="relative mt-14 w-full md:mt-12 md:min-h-[100svh]"
      >
        <div className="mx-auto flex min-h-[36rem] w-full max-w-2xl flex-col items-center justify-center gap-10 px-4 text-center sm:px-8 md:min-h-[100svh] md:gap-12">
          <div className="relative mx-auto flex w-full flex-col items-center">
            <div className="relative mx-auto flex min-h-[18rem] w-full items-center justify-center sm:min-h-[20rem]">
              {gapDemo.stages.map((stage, index) => (
                <div
                  key={stage.situation}
                  data-gap-stage-block={index}
                  className={cn(
                    "absolute inset-0 flex w-full flex-col items-center justify-center gap-3 text-center",
                    index > 0 && "invisible opacity-0"
                  )}
                >
                  <WordLine
                    text={stage.confidence}
                    line="confidence"
                    className="max-w-xl text-base leading-relaxed text-muted sm:text-lg"
                  />
                  <WordLine
                    text={stage.moment}
                    line="moment"
                    className="max-w-xl text-lg font-medium leading-snug text-foreground sm:text-xl"
                  />
                  <WordLine
                    text={stage.gap}
                    line="gap"
                    className="marketing-gap-low max-w-xl text-base leading-relaxed sm:text-lg"
                  />
                  <div
                    data-gap-line="real"
                    className="flex w-full flex-col items-center justify-center gap-1.5 opacity-0"
                  >
                    <p
                      data-gap-meaning
                      className="text-center text-[11px] font-medium italic tracking-wide text-muted sm:text-xs"
                    >
                      &ldquo;{stage.meaning}&rdquo;
                    </p>
                    <button
                      type="button"
                      data-cursor-interactive
                      data-cursor-highlight
                      data-gap-phrase
                      onClick={() =>
                        playJapaneseAudio(stage.audioSrc, stage.real)
                      }
                      className="marketing-gap-phrase mx-auto font-japanese text-[clamp(1.45rem,4vw,2.55rem)] leading-snug tracking-wide transition-[color,padding] duration-300"
                      style={{ color: "var(--mode-listen)" }}
                      aria-label={`Play audio: ${stage.real}. ${stage.meaning}. Hover, then click to play.`}
                    >
                      {stage.real}
                    </button>
                    <p
                      data-gap-play-hint
                      className="marketing-gap-play-hint m-0 flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted sm:text-[11px]"
                      aria-hidden
                    >
                      <span
                        className="marketing-gap-play-hint-icon"
                        style={{ color: "var(--mode-listen)" }}
                      />
                      <span className="marketing-gap-play-hint-fine">
                        {gapDemo.playHint}
                      </span>
                      <span className="marketing-gap-play-hint-touch">
                        {gapDemo.playHintTouch}
                      </span>
                    </p>
                  </div>
                  <WordLine
                    text={stage.payoff}
                    line="payoff"
                    className="max-w-lg text-sm leading-relaxed text-muted sm:text-base"
                  />

                  <div className="sr-only">
                    <p>{stage.confidence}</p>
                    <p>{stage.moment}</p>
                    <p>{stage.gap}</p>
                    <p>
                      {stage.meaning}. {stage.real}
                    </p>
                    <p>{stage.payoff}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto flex w-full max-w-md flex-col items-center justify-center text-center">
            <ul
              className="relative mx-auto flex w-full list-none flex-col items-center space-y-1 p-0"
              aria-label="Real situations"
            >
              {gapDemo.stages.map((stage) => (
                <li
                  key={stage.situation}
                  data-gap-item
                  data-active="false"
                  data-done="false"
                  className="marketing-gap-item flex w-full max-w-sm items-center justify-center gap-3 rounded-xl border border-transparent px-2 py-2.5 text-center text-base sm:text-lg"
                >
                  <span
                    className="shrink-0"
                    style={{ color: "var(--mode-listen)" }}
                    aria-hidden
                  >
                    <CheckIcon />
                  </span>
                  <span className="font-display font-medium tracking-tight">
                    {stage.situation}
                  </span>
                </li>
              ))}
            </ul>

            <div className="relative mx-auto mt-8 flex min-h-[5.5rem] w-full items-start justify-center sm:min-h-[6.25rem]">
              {gapDemo.closing.map((line, lineIndex) => (
                <p
                  key={line}
                  data-gap-closing-line={lineIndex}
                  className="absolute inset-x-0 top-0 m-0 px-2 text-center text-base leading-relaxed text-muted opacity-0 sm:text-lg"
                  aria-hidden
                >
                  {splitWords(line).map((part, index) => {
                    if (/^\s+$/.test(part)) {
                      return (
                        <span key={`c${lineIndex}-s-${index}`}>{part}</span>
                      );
                    }
                    return (
                      <span
                        key={`c${lineIndex}-w-${index}`}
                        data-gap-word
                        className="inline-block opacity-0 will-change-transform"
                      >
                        {part}
                      </span>
                    );
                  })}
                </p>
              ))}
              <div className="sr-only">
                {gapDemo.closing.map((line) => (
                  <p key={`sr-${line}`}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
