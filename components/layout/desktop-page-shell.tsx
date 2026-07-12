"use client";

import { cn } from "@/lib/utils";

interface DesktopPageShellProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function DesktopPageShell({
  children,
  className,
  fullWidth = false,
}: DesktopPageShellProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-8 py-6",
        !fullWidth && "max-w-[1400px]",
        className
      )}
    >
      {children}
    </div>
  );
}
