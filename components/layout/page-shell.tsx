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
        "mx-auto max-w-lg px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))] md:max-w-none md:px-8 lg:max-w-5xl lg:px-10 xl:max-w-6xl",
        className
      )}
    >
      {children}
    </div>
  );
}
