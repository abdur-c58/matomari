"use client";

import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div
      className={cn(
        "mx-auto max-w-lg px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]",
        className
      )}
    >
      {children}
    </div>
  );
}
