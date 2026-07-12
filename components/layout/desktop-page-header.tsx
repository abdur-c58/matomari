"use client";

import { cn } from "@/lib/utils";

interface DesktopPageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function DesktopPageHeader({
  title,
  subtitle,
  action,
  className,
}: DesktopPageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-6 flex items-start justify-between gap-4 border-b border-border pb-5",
        className
      )}
    >
      <div>
        {subtitle && (
          <p className="text-sm font-medium text-muted">{subtitle}</p>
        )}
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}
