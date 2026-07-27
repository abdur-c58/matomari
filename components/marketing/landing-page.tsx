"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import {
  SmoothScrollProvider,
  useSmoothScroll,
} from "@/components/marketing/motion/smooth-scroll-provider";
import {
  consumePendingMarketingSection,
  isMarketingSectionId,
  isPageReload,
  scrollMarketingToTop,
  scrollToMarketingSection,
} from "@/components/marketing/motion/scroll-to-section";
import { HeroSection } from "@/components/marketing/sections/hero-section";
import { ProblemSection } from "@/components/marketing/sections/problem-section";
import { FeatureShowcaseSection } from "@/components/marketing/sections/feature-showcase-section";
import { HorizontalFeaturesSection } from "@/components/marketing/sections/horizontal-features-section";
import { NarrationSection } from "@/components/marketing/sections/narration-section";
import { SocialProofSection } from "@/components/marketing/sections/social-proof-section";
import { PricingSection } from "@/components/marketing/sections/pricing-section";
import { CtaSection } from "@/components/marketing/sections/cta-section";
import { MarketingSectionRail } from "@/components/marketing/marketing-section-rail";

function LandingScrollBootstrap() {
  const { lenis, ready } = useSmoothScroll();

  useEffect(() => {
    if (!ready) return;

    // Refresh must land at the top — ignore hash / pending section restore.
    if (isPageReload()) {
      if (window.location.hash) {
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search
        );
      }
      // Drop any stale pending jump left from a prior visit.
      consumePendingMarketingSection();
      scrollMarketingToTop(lenis);
      return;
    }

    const hash = window.location.hash.replace(/^#/, "");
    const pending = consumePendingMarketingSection();
    const targetId =
      pending ?? (isMarketingSectionId(hash) ? hash : null);

    if (window.location.hash) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
    }

    if (!targetId) return;

    const timer = window.setTimeout(() => {
      scrollToMarketingSection(targetId, lenis);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [lenis, ready]);

  return null;
}

function MotionReadyFallback({
  pageRef,
}: {
  pageRef: RefObject<HTMLDivElement | null>;
}) {
  const { ready } = useSmoothScroll();

  // If a section never mounts GSAP (or is slow), don't leave content invisible.
  useLayoutEffect(() => {
    if (!ready) return;
    const page = pageRef.current;
    if (!page) return;

    if (page.dataset.motionReady === "true") return;

    const timer = window.setTimeout(() => {
      page.dataset.motionReady = "true";
    }, 120);

    return () => window.clearTimeout(timer);
  }, [ready, pageRef]);

  return null;
}

export function LandingPage() {
  const pageRef = useRef<HTMLDivElement>(null);

  return (
    <SmoothScrollProvider>
      <div
        ref={pageRef}
        className="marketing-page relative min-h-dvh bg-background text-foreground"
      >
        <MarketingNav />
        <MarketingSectionRail />
        <LandingScrollBootstrap />
        <MotionReadyFallback pageRef={pageRef} />
        <main>
          <HeroSection />
          <ProblemSection />
          <FeatureShowcaseSection />
          <HorizontalFeaturesSection />
          <NarrationSection />
          <SocialProofSection />
          <PricingSection />
          <CtaSection />
        </main>
        <MarketingFooter />
      </div>
    </SmoothScrollProvider>
  );
}
