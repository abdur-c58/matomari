"use client";

import { PageShell } from "@/components/layout/page-shell";
import { DesktopPageShell } from "@/components/layout/desktop-page-shell";
import { MOBILE_MEDIA_QUERY, useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";

interface ResponsivePageShellProps {
  children: React.ReactNode;
  className?: string;
  desktopClassName?: string;
  fullWidth?: boolean;
}

export function ResponsivePageShell({
  children,
  className,
  desktopClassName,
  fullWidth,
}: ResponsivePageShellProps) {
  const isMobile = useIsMobileViewport(MOBILE_MEDIA_QUERY);

  if (isMobile) {
    return <PageShell className={className}>{children}</PageShell>;
  }

  return (
    <DesktopPageShell className={desktopClassName} fullWidth={fullWidth}>
      {children}
    </DesktopPageShell>
  );
}
