"use client";

import { MOBILE_MEDIA_QUERY, useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { ActiveRecallModeMobile } from "@/components/mobile/active-recall-mode";
import { ActiveRecallModeDesktop } from "@/components/desktop/active-recall-desktop";

export function ActiveRecallMode() {
  const isMobile = useIsMobileViewport(MOBILE_MEDIA_QUERY);
  return isMobile ? <ActiveRecallModeMobile /> : <ActiveRecallModeDesktop />;
}
