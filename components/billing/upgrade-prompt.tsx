"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function UpgradePrompt({
  title,
  description,
  href = "/pricing",
  ctaLabel = "View plans",
  className,
}: {
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface/80 px-4 py-5 text-center sm:px-6",
        className
      )}
    >
      <p className="font-display text-lg font-semibold tracking-tight text-foreground">
        {title}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
        {description}
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[color:var(--mode-listen)] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
