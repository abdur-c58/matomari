"use client";

import { APP_NAME } from "@/lib/constants/branding";
import { cn } from "@/lib/utils";

type MatomariLogoProps = {
  className?: string;
  size?: number;
  variant?: "source" | "transparent";
};

export function MatomariLogo({
  className,
  size = 120,
  variant = "source",
}: MatomariLogoProps) {
  const src =
    variant === "transparent"
      ? "/brand/matomari-logo-transparent.png"
      : "/brand/matomari-logo-source.png";

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={APP_NAME}
      className={cn("object-contain", className)}
    />
  );
}
