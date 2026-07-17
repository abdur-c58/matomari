"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { InViewVideo } from "@/components/marketing/motion/in-view-video";
import { MARKETING_DESKTOP_MQ, MARKETING_Z } from "@/components/marketing/motion/easings";
import { useGsapContext } from "@/components/marketing/motion/use-gsap-context";
import { usePointerTilt } from "@/components/marketing/motion/use-pointer-tilt";
import { usePrefersReducedMotion } from "@/components/marketing/motion/use-prefers-reduced-motion";
import { marketingVideo } from "@/lib/constants/marketing";

gsap.registerPlugin(ScrollTrigger);

export function VideoShowcaseSection() {
  const rootRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  usePointerTilt(frameRef, { maxX: 3.5, maxY: 2.8 });

  useGsapContext(rootRef, () => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();

    mm.add(MARKETING_DESKTOP_MQ, () => {
      const scrollRig = root.querySelector("[data-scroll-rig]");
      const caption = root.querySelector("[data-video-caption]");
      const stripe = root.querySelector("[data-video-stripe]");

      if (scrollRig) {
        gsap.fromTo(
          scrollRig,
          {
            rotateX: 7,
            rotateY: -9,
            z: MARKETING_Z.far,
            scale: 0.94,
          },
          {
            rotateX: -1.5,
            rotateY: 3,
            z: MARKETING_Z.near,
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top 80%",
              end: "center 35%",
              scrub: 0.55,
            },
          }
        );
      }
      if (caption) {
        gsap.fromTo(
          caption,
          { x: -40, opacity: 0.25, z: -30 },
          {
            x: 0,
            opacity: 1,
            z: 40,
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
      if (stripe) {
        gsap.fromTo(
          stripe,
          { scaleX: 0.2 },
          {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top 70%",
              end: "center center",
              scrub: 0.4,
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
      id="walkthrough"
      className="relative overflow-hidden py-16 md:py-28"
    >
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 sm:px-8 md:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] md:items-end md:gap-4">
        <div data-video-caption className="marketing-depth md:pb-6 md:pr-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            {marketingVideo.eyebrow}
          </p>
          <h2 className="marketing-giant-type mt-4 text-[clamp(2.2rem,5vw,4rem)]">
            {marketingVideo.title}
          </h2>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-muted">
            {marketingVideo.body}
          </p>
          <div
            data-video-stripe
            className="marketing-hard-stripe mt-8 h-1 w-40 origin-left"
            aria-hidden
          />
        </div>

        <div
          ref={frameRef}
          className="marketing-scene relative -mx-4 sm:mx-0 md:translate-x-6 lg:translate-x-12"
        >
          <div data-scroll-rig className="marketing-scroll-rig will-change-transform">
            <div data-pointer-rig className="marketing-pointer-rig">
              <div className="overflow-hidden rounded-none border-y border-border bg-black shadow-lg sm:rounded-2xl sm:border">
                <InViewVideo autoPlayOnView={!reduced} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-5 max-w-[1400px] px-4 text-sm text-muted sm:px-8 md:text-right">
        {reduced
          ? "Use the controls to play the walkthrough."
          : "Plays muted when this section enters view."}
      </p>
    </section>
  );
}
