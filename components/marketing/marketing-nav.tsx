"use client";

import Link from "next/link";
import { KotoshimaLogo } from "@/components/brand/kotoshima-logo";
import { Button } from "@/components/ui/button";
import { MarketingAuthCta } from "@/components/marketing/marketing-auth-cta";
import { MarketingThemeToggle } from "@/components/marketing/theme-toggle";
import { APP_NAME } from "@/lib/constants/branding";
import { cn } from "@/lib/utils";

export function MarketingNav({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-40",
        className
      )}
    >
      <div className="pointer-events-auto mx-auto mt-2 flex max-w-[1400px] items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background/75 px-4 py-2 shadow-sm backdrop-blur-xl sm:px-5">
        <Link href="/" className="flex items-center gap-3 text-foreground">
          <KotoshimaLogo size={36} />
          <span className="font-display text-lg font-semibold tracking-tight">
            {APP_NAME}
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/pricing">Pricing</Link>
          </Button>
          <MarketingThemeToggle />
          <MarketingAuthCta size="sm" signedOutLabel="Sign in" signedInLabel="Open Dashboard" />
        </nav>
      </div>
    </header>
  );
}
