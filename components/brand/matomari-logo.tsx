"use client";

import { APP_NAME } from "@/lib/constants/branding";
import { cn } from "@/lib/utils";

type MatomariLogoProps = {
  className?: string;
  /** Height in px; width follows the calligraphy aspect ratio. */
  size?: number;
  /** svg = vector mark (nav/footer). source/transparent = raster brand assets. */
  variant?: "svg" | "source" | "transparent";
};

/** Tightened calligraphy viewBox aspect (853×388). */
const LOGO_ASPECT = 853 / 388;

export function MatomariLogo({
  className,
  size = 36,
  variant = "svg",
}: MatomariLogoProps) {
  if (variant === "source" || variant === "transparent") {
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
        decoding="async"
      />
    );
  }

  const height = size;
  const width = Math.round(size * LOGO_ASPECT);

  // Mask keeps one cached SVG request while inheriting --foreground for light/dark.
  return (
    <span
      role="img"
      aria-label={APP_NAME}
      className={cn("inline-block shrink-0 bg-foreground", className)}
      style={{
        width,
        height,
        maskImage: "url(/brand/matomari-logo.svg)",
        WebkitMaskImage: "url(/brand/matomari-logo.svg)",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}
