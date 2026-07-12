import { APP_NAME } from "@/lib/constants/branding";
import { cn } from "@/lib/utils";

type KotoshimaLogoProps = {
  className?: string;
  size?: number;
};

export function KotoshimaLogo({ className, size = 120 }: KotoshimaLogoProps) {
  const maskId = "kotoshima-mark-inline";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1065 1065"
      width={size}
      height={size}
      className={cn("text-foreground", className)}
      role="img"
      aria-label={APP_NAME}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="1065" height="1065">
          <image href="/readmeimage.png" width="1065" height="1065" preserveAspectRatio="xMidYMid meet" />
        </mask>
      </defs>
      <rect width="1065" height="1065" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  );
}
