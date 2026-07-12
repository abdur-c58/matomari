"use client";

import { MOBILE_MEDIA_QUERY, useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { LibraryViewMobile } from "@/components/mobile/library-view";
import { LibraryViewDesktop } from "@/components/desktop/library-view-desktop";

export function LibraryView() {
  const isMobile = useIsMobileViewport(MOBILE_MEDIA_QUERY);
  return isMobile ? <LibraryViewMobile /> : <LibraryViewDesktop />;
}
