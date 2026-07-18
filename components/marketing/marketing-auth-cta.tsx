"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/marketing/motion/magnetic-button";
import { signInWithGoogle } from "@/lib/auth/client-auth";
import { cn } from "@/lib/utils";

type MarketingAuthCtaProps = {
  size?: "sm" | "lg";
  signedOutLabel: string;
  signedInLabel?: string;
  className?: string;
  magnetic?: boolean;
};

export function MarketingAuthCta({
  size = "sm",
  signedOutLabel,
  signedInLabel = "Open Dashboard",
  className,
  magnetic = true,
}: MarketingAuthCtaProps) {
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated" && Boolean(session?.user);

  if (signedIn) {
    return (
      <Button
        asChild
        size={size}
        className={cn("marketing-dashboard-cta", className)}
      >
        <Link href="/today">
          <ArrowRight
            className={cn(
              "marketing-dashboard-cta-arrow",
              size === "lg" ? "h-5 w-5" : "h-4 w-4"
            )}
          />
          <span className="marketing-dashboard-cta-label">{signedInLabel}</span>
        </Link>
      </Button>
    );
  }

  const button = (
    <Button
      size={size}
      className={className}
      onClick={() => void signInWithGoogle()}
      disabled={status === "loading"}
    >
      <LogIn className={size === "lg" ? "h-5 w-5" : "h-4 w-4"} />
      {signedOutLabel}
    </Button>
  );

  if (!magnetic) return button;
  return <MagneticButton>{button}</MagneticButton>;
}
