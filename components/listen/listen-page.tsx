"use client";

import { MOBILE_MEDIA_QUERY, useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { ListenPageMobile } from "@/components/mobile/listen-page";
import { ListenPageDesktop } from "@/components/desktop/listen-page-desktop";

export function ListenPage() {
  const isMobile = useIsMobileViewport(MOBILE_MEDIA_QUERY);
  return isMobile ? <ListenPageMobile /> : <ListenPageDesktop />;
}
