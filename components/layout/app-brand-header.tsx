"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { MatomariLogo } from "@/components/brand/matomari-logo";
import { formatAppGreeting, getTimeOfDayGreeting } from "@/lib/utils/greeting";
import { cn } from "@/lib/utils";

type AppBrandHeaderProps = {
  variant: "sidebar" | "mobile";
  className?: string;
};

export function AppBrandHeader({ variant, className }: AppBrandHeaderProps) {
  const { data: session, status } = useSession();
  const loading = status === "loading";

  const logoSize = variant === "sidebar" ? 36 : 32;
  const greeting =
    loading || !session?.user
      ? getTimeOfDayGreeting()
      : formatAppGreeting(session.user);

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <Link
        href="/"
        aria-label="Go to home"
        className="shrink-0 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
      >
        <MatomariLogo size={logoSize} />
      </Link>
      <p
        className={cn(
          "min-w-0 font-display font-bold tracking-tight text-foreground",
          variant === "sidebar"
            ? "truncate text-base leading-snug"
            : "text-sm leading-snug [overflow-wrap:anywhere]"
        )}
      >
        {loading ? getTimeOfDayGreeting() : greeting}
      </p>
    </div>
  );
}
