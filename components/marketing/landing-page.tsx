"use client";

import { useEffect } from "react";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import {
  SmoothScrollProvider,
  useSmoothScroll,
} from "@/components/marketing/motion/smooth-scroll-provider";
import {
  consumePendingMarketingSection,
  isMarketingSectionId,
  scrollToMarketingSection,
} from "@/components/marketing/motion/scroll-to-section";
import { HeroSection } from "@/components/marketing/sections/hero-section";
import { ProblemSection } from "@/components/marketing/sections/problem-section";
import { FeatureShowcaseSection } from "@/components/marketing/sections/feature-showcase-section";
import { HorizontalFeaturesSection } from "@/components/marketing/sections/horizontal-features-section";
import { NarrationSection } from "@/components/marketing/sections/narration-section";
import { VideoShowcaseSection } from "@/components/marketing/sections/video-showcase-section";
import { SocialProofSection } from "@/components/marketing/sections/social-proof-section";
import { PricingSection } from "@/components/marketing/sections/pricing-section";
import { CtaSection } from "@/components/marketing/sections/cta-section";
import { MarketingCustomCursor } from "@/components/marketing/custom-cursor";
import { MarketingSectionRail } from "@/components/marketing/marketing-section-rail";

function LandingScrollBootstrap() {
  const { lenis, ready } = useSmoothScroll();

  useEffect(() => {
    if (!ready) return;

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

export function LandingPage() {
  return (
    <SmoothScrollProvider>
      <div className="marketing-page relative min-h-dvh bg-background text-foreground">
        <MarketingCustomCursor />
        <MarketingNav />
        <MarketingSectionRail />
        <LandingScrollBootstrap />
        <main>
          <HeroSection />
          <ProblemSection />
          <FeatureShowcaseSection />
          <HorizontalFeaturesSection />
          <NarrationSection />
          <VideoShowcaseSection />
          <SocialProofSection />
          <PricingSection />
          <CtaSection />
        </main>
        <MarketingFooter />
      </div>
    </SmoothScrollProvider>
  );
}
