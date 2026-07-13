"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  onBackClick?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  onBackClick,
  action,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("mb-6 flex items-start justify-between gap-3", className)}>
      <div className="flex items-start gap-3">
        {(backHref || onBackClick) && (
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0"
            asChild={!onBackClick}
          >
            {onBackClick ? (
              <button type="button" onClick={onBackClick}>
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <Link href={backHref!}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            )}
          </Button>
        )}
        <div>
          {subtitle && (
            <p className="text-sm font-medium text-muted">{subtitle}</p>
          )}
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {title}
          </h1>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
