"use client";

import { PageHeader } from "@/components/layout/page-header";
import { DesktopPageHeader } from "@/components/layout/desktop-page-header";
import { MOBILE_MEDIA_QUERY, useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";

interface ResponsivePageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: React.ReactNode;
  className?: string;
}

export function ResponsivePageHeader(props: ResponsivePageHeaderProps) {
  const isMobile = useIsMobileViewport(MOBILE_MEDIA_QUERY);

  if (isMobile) {
    return <PageHeader {...props} />;
  }

  const { backHref: _back, ...desktopProps } = props;
  return <DesktopPageHeader {...desktopProps} />;
}
