"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { MARKETING_VIDEO } from "@/lib/constants/marketing";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

type InViewVideoProps = {
  className?: string;
  /** When true (default), mute-loop autoplay while intersecting. Disabled for reduced motion. */
  autoPlayOnView?: boolean;
};

/**
 * Muted looping in-view video. No scroll-scrub / currentTime mapping.
 */
export function InViewVideo({
  className,
  autoPlayOnView = true,
}: InViewVideoProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    const root = rootRef.current;
    if (!video || !root) return;

    if (reduced || !autoPlayOnView) {
      video.pause();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { threshold: [0, 0.3, 0.6] }
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [autoPlayOnView, reduced]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <video
        ref={videoRef}
        className="h-auto w-full bg-black object-cover"
        src={MARKETING_VIDEO.src}
        poster={MARKETING_VIDEO.poster}
        width={MARKETING_VIDEO.width}
        height={MARKETING_VIDEO.height}
        muted
        playsInline
        loop
        preload="metadata"
        controls={reduced}
        aria-label="Matomari product walkthrough"
      />
    </div>
  );
}
