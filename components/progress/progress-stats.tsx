"use client";

import { MOBILE_MEDIA_QUERY, useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { ProgressStatsMobile } from "@/components/mobile/progress-stats";
import { ProgressStatsDesktop } from "@/components/desktop/progress-stats-desktop";

export function ProgressStats() {
  const isMobile = useIsMobileViewport(MOBILE_MEDIA_QUERY);
  return isMobile ? <ProgressStatsMobile /> : <ProgressStatsDesktop />;
}
