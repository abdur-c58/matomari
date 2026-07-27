"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  AudioIllustration,
  ScenesIllustration,
  SharingIllustration,
} from "@/components/marketing/illustrations/feature-illustrations";
import { MARKETING_DESKTOP_MQ } from "@/components/marketing/motion/easings";
import { useGsapContext } from "@/components/marketing/motion/use-gsap-context";
import { usePointerTilt } from "@/components/marketing/motion/use-pointer-tilt";
import { marketingHorizontalFeatures } from "@/lib/constants/marketing";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

const accents = [
  "var(--mode-meaning)",
  "var(--mode-listen)",
  "var(--mode-review)",
] as const;

const illustrations = [
  ScenesIllustration,
  AudioIllustration,
  SharingIllustration,
] as const;

function FeatureVisual({
  index,
  accent,
  className,
}: {
  index: number;
  accent: string;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const Illustration = illustrations[index];
  usePointerTilt(rootRef, { maxX: 4, maxY: 3 });

  return (
    <div ref={rootRef} className={cn("marketing-scene relative z-10", className)}>
      <div data-pointer-rig className="marketing-pointer-rig">
        <div
          data-feature-visual
          className="marketing-feature-morph-visual relative mx-auto aspect-[300/220] w-full max-w-[50rem]"
          style={{
            color: accent,
            filter: `drop-shadow(0 24px 44px color-mix(in srgb, ${accent} 40%, transparent))`,
          }}
        >
          <Illustration />
        </div>
      </div>
    </div>
  );
}

export function HorizontalFeaturesSection() {
  const rootRef = useRef<HTMLElement>(null);

  useGsapContext(rootRef, () => {
    const root = rootRef.current;
    if (!root) return;

    const mm = gsap.matchMedia();
    mm.add(MARKETING_DESKTOP_MQ, () => {
      const stage = root.querySelector<HTMLElement>("[data-feature-desktop]");
      const scenes = gsap.utils.toArray<HTMLElement>(
        root.querySelectorAll("[data-feature-scene]")
      );
      const visuals = gsap.utils.toArray<HTMLElement>(
        root.querySelectorAll("[data-feature-visual]")
      );
      const copies = gsap.utils.toArray<HTMLElement>(
        root.querySelectorAll("[data-feature-copy]")
      );
      const ambients = gsap.utils.toArray<HTMLElement>(
        root.querySelectorAll("[data-feature-ambient]")
      );
      const dots = gsap.utils.toArray<HTMLElement>(
        root.querySelectorAll("[data-feature-dot]")
      );
      const progress = root.querySelector<HTMLElement>("[data-feature-progress]");
      const portal = root.querySelector<HTMLElement>("[data-feature-portal]");
      if (!stage || scenes.length !== 3) return;

      stage.dataset.enhanced = "true";
      gsap.set(scenes, { autoAlpha: 0, pointerEvents: "none" });
      gsap.set(scenes[0], { autoAlpha: 1, pointerEvents: "auto" });
      gsap.set(visuals, {
        transformPerspective: 1000,
        transformOrigin: "50% 50%",
        z: 0,
      });
      gsap.set(dots, { scale: 0.7, opacity: 0.35 });
      gsap.set(dots[0], { scale: 1.25, opacity: 1 });
      gsap.set(progress, { scaleX: 0 });

      // Restore the three-scene warp while keeping every part of the pin active:
      // dwell ranges use micro-motion and flow directly into overlapping morphs.
      const dwell = 0.72;
      const warp = 1;
      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: () => `+=${Math.round(window.innerHeight * 1.72)}`,
          pin: true,
          scrub: 0.35,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (progress) gsap.set(progress, { scaleX: self.progress });
          },
        },
      });

      const addDwell = (sceneIndex: number, at: number) => {
        timeline
          .to(
            visuals[sceneIndex],
            {
              z: 26,
              rotateY: sceneIndex % 2 ? 3.5 : -3.5,
              rotateX: 1.5,
              duration: dwell,
              ease: "none",
            },
            at
          )
          .to(
            copies[sceneIndex],
            { y: -8, duration: dwell, ease: "none" },
            at
          )
          .to(
            ambients[sceneIndex],
            { scale: 1.07, opacity: 1, duration: dwell, ease: "none" },
            at
          );

        if (portal) {
          timeline.to(
            portal,
            {
              rotate: `+=${12 + sceneIndex * 4}`,
              scale: sceneIndex === 1 ? 1.06 : 1.02,
              duration: dwell,
              ease: "none",
            },
            at
          );
        }
      };

      addDwell(0, 0);

      for (let index = 1; index < scenes.length; index += 1) {
        const previous = index - 1;
        const at = previous * (dwell + warp) + dwell;
        const direction = index % 2 === 0 ? -1 : 1;

        timeline
          .to(
            copies[previous],
            {
              xPercent: -22 * direction,
              y: -20,
              opacity: 0,
              duration: warp * 0.56,
              ease: "power2.in",
            },
            at
          )
          .to(
            visuals[previous],
            {
              scaleX: 0.06,
              scaleY: 1.55,
              rotateY: 76 * direction,
              rotateZ: 14 * direction,
              z: 140,
              opacity: 0,
              duration: warp * 0.64,
              ease: "power2.in",
            },
            at + warp * 0.03
          )
          .to(
            ambients[previous],
            {
              scale: 0.55,
              opacity: 0,
              xPercent: 24 * direction,
              duration: warp * 0.54,
              ease: "power2.in",
            },
            at + warp * 0.04
          )
          .set(
            scenes[index],
            { autoAlpha: 1, pointerEvents: "auto" },
            at + warp * 0.08
          )
          .fromTo(
            visuals[index],
            {
              scaleX: 0.04,
              scaleY: 1.5,
              rotateY: -76 * direction,
              rotateZ: -16 * direction,
              z: -170,
              opacity: 0,
            },
            {
              scaleX: 1,
              scaleY: 1,
              rotateY: 0,
              rotateZ: 0,
              z: 0,
              opacity: 1,
              duration: warp * 0.76,
              ease: "back.out(1.35)",
            },
            at + warp * 0.14
          )
          .fromTo(
            copies[index],
            {
              xPercent: 22 * direction,
              y: 28,
              opacity: 0,
            },
            {
              xPercent: 0,
              y: 0,
              opacity: 1,
              duration: warp * 0.68,
              ease: "power3.out",
            },
            at + warp * 0.2
          )
          .fromTo(
            ambients[index],
            {
              scale: 0.5,
              opacity: 0,
              xPercent: -22 * direction,
            },
            {
              scale: 1,
              opacity: 0.9,
              xPercent: 0,
              duration: warp * 0.72,
              ease: "power3.out",
            },
            at + warp * 0.14
          )
          .to(
            dots[previous],
            {
              scale: 0.7,
              opacity: 0.35,
              duration: warp * 0.4,
              ease: "power3.out",
            },
            at + warp * 0.08
          )
          .to(
            dots[index],
            {
              scale: 1.25,
              opacity: 1,
              duration: warp * 0.46,
              ease: "back.out(1.6)",
            },
            at + warp * 0.18
          )
          .set(
            scenes[previous],
            { autoAlpha: 0, pointerEvents: "none" },
            at + warp * 0.72
          );

        const nextParts = scenes[index].querySelectorAll(
          "[data-illustration-part]:not([data-illustration-particle])"
        );
        if (nextParts.length) {
          timeline.fromTo(
            nextParts,
            {
              x: (partIndex) => (partIndex % 2 ? 72 : -72),
              y: (partIndex) => (partIndex % 3 ? 38 : -46),
              rotate: (partIndex) => (partIndex % 2 ? 22 : -22),
              scale: 0.55,
              opacity: 0,
            },
            {
              x: 0,
              y: 0,
              rotate: 0,
              scale: 1,
              opacity: 1,
              stagger: 0.04,
              duration: warp * 0.68,
              ease: "back.out(1.4)",
            },
            at + warp * 0.2
          );
        }

        if (portal) {
          timeline.to(
            portal,
            {
              rotate: index * 36,
              scale: index === 1 ? 1.12 : 0.96,
              borderRadius:
                index === 1 ? "34% 66% 58% 42%" : "58% 42% 35% 65%",
              duration: warp,
              ease: "power2.inOut",
            },
            at
          );
        }

        addDwell(index, at + warp);
      }
    });

    mm.add("(max-width: 767px)", () => {
      const scenes = root.querySelectorAll("[data-feature-mobile-scene]");
      scenes.forEach((scene) => {
        const parts = scene.querySelectorAll(
          "[data-illustration-part]:not([data-illustration-particle])"
        );
        gsap.fromTo(
          [scene, ...Array.from(parts)],
          { opacity: 0, y: 28, scale: 0.88, rotate: -4 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            rotate: 0,
            stagger: 0.055,
            duration: 0.8,
            ease: "back.out(1.3)",
            scrollTrigger: {
              trigger: scene,
              start: "top 82%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });
    });

    return () => {
      const stage = root.querySelector<HTMLElement>("[data-feature-desktop]");
      if (stage) delete stage.dataset.enhanced;
      mm.revert();
    };
  }, []);

  return (
    <section
      ref={rootRef}
      id="scenes"
      className="relative overflow-hidden bg-background"
      aria-label="Scenes, audio, and sharing"
    >
      {/* Desktop: pinned, full-screen scene morph */}
      <div
        data-feature-desktop
        className="relative hidden min-h-[100svh] md:block"
      >
        <div
          data-feature-portal
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[min(68vw,52rem)] w-[min(68vw,52rem)] -translate-x-1/2 -translate-y-1/2 rounded-[58%_42%_35%_65%] border border-border/60 bg-surface/40"
          aria-hidden
        />

        {marketingHorizontalFeatures.map((feature, index) => {
          const accent = accents[index];
          const copyOnLeft = index !== 1;
          return (
            <article
              key={feature.id}
              data-feature-scene
              className="absolute inset-0 grid min-h-[100svh] grid-cols-12 items-center px-[max(2rem,6vw)] py-20"
              style={{ opacity: index === 0 ? 1 : 0 }}
            >
                <div
                  data-feature-ambient
                  className="marketing-accent-glow pointer-events-none absolute left-1/2 top-1/2 h-[70vh] w-[70vw] -translate-x-1/2 -translate-y-1/2 rounded-[45%] opacity-90 blur-3xl"
                  style={{
                    background: `radial-gradient(ellipse, color-mix(in srgb, ${accent} 46%, transparent), transparent 68%)`,
                  }}
                  aria-hidden
                />

                <div
                  data-feature-copy
                  className={cn(
                    "relative z-20 col-span-4 max-w-xl",
                    copyOnLeft ? "col-start-1" : "col-start-9"
                  )}
                >
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color: accent }}
                  >
                    {feature.eyebrow}
                  </p>
                  <h2 className="mt-4 font-display text-[clamp(2.2rem,4.2vw,4.6rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-foreground">
                    {feature.title}
                  </h2>
                  <p className="mt-6 text-base leading-relaxed text-foreground/90">
                    {feature.body}
                  </p>
                  <ul className="mt-6 space-y-3 border-t border-border pt-5 text-sm text-foreground/85">
                    {feature.points.map((point) => (
                      <li key={point} className="flex gap-3">
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{
                            background: accent,
                            boxShadow: `0 0 12px ${accent}`,
                          }}
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <FeatureVisual
                  index={index}
                  accent={accent}
                  className={cn(
                    "col-span-7",
                    copyOnLeft ? "col-start-6" : "col-start-1"
                  )}
                />
            </article>
          );
        })}

        <div className="absolute inset-x-[6vw] bottom-8 z-30 flex items-center gap-4">
          <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-border">
            <div
              data-feature-progress
              className="marketing-progress-fill absolute inset-0 origin-left scale-x-0"
            />
          </div>
          <div className="flex gap-3">
            {accents.map((accent, index) => (
              <span
                key={accent}
                data-feature-dot
                className="h-3 w-3 rounded-full"
                style={{
                  background: accent,
                  boxShadow: `0 0 12px ${accent}`,
                  opacity: index === 0 ? 1 : 0.35,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: stacked scenes, no pin / morph */}
      <div data-feature-fallback className="grid gap-0 md:hidden">
        {marketingHorizontalFeatures.map((feature, index) => {
          const Illustration = illustrations[index];
          const accent = accents[index];
          return (
            <article
              key={feature.id}
              data-feature-mobile-scene
              className="relative flex min-h-[72svh] flex-col justify-center overflow-hidden px-4 py-12 sm:min-h-[88svh] sm:px-8 sm:py-16"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{
                  background: `radial-gradient(ellipse at 50% 35%, color-mix(in srgb, ${accent} 38%, transparent), transparent 65%)`,
                }}
                aria-hidden
              />
              <div className="marketing-scene relative z-10 mx-auto aspect-[300/220] w-full max-w-md">
                <Illustration />
              </div>
              <div className="relative z-10 mt-8 max-w-xl">
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.2em]"
                  style={{ color: accent }}
                >
                  {feature.eyebrow}
                </p>
                <h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight">
                  {feature.title}
                </h2>
                <p className="mt-4 leading-relaxed text-foreground/90">{feature.body}</p>
                <ul className="mt-5 space-y-2 text-sm text-foreground/85">
                  {feature.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ background: accent }}
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
