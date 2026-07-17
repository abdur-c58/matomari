"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/marketing/motion/magnetic-button";
import { signInWithGoogle } from "@/lib/auth/client-auth";

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

  const button = signedIn ? (
    <Button asChild size={size} className={className}>
      <Link href="/today">
        <ArrowRight className={size === "lg" ? "h-5 w-5" : "h-4 w-4"} />
        {signedInLabel}
      </Link>
    </Button>
  ) : (
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
