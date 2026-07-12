"use client";

import { MOBILE_MEDIA_QUERY, useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { WeakSentencesViewMobile } from "@/components/mobile/weak-sentences-view";
import { WeakSentencesViewDesktop } from "@/components/desktop/weak-sentences-desktop";

export function WeakSentencesView() {
  const isMobile = useIsMobileViewport(MOBILE_MEDIA_QUERY);
  return isMobile ? <WeakSentencesViewMobile /> : <WeakSentencesViewDesktop />;
}
