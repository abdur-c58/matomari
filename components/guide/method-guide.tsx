"use client";

import { MOBILE_MEDIA_QUERY, useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { MethodGuideMobile } from "@/components/mobile/method-guide";
import { MethodGuideDesktop } from "@/components/desktop/guide-screen-desktop";

export function MethodGuide() {
  const isMobile = useIsMobileViewport(MOBILE_MEDIA_QUERY);
  return isMobile ? <MethodGuideMobile /> : <MethodGuideDesktop />;
}
