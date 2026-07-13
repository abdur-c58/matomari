"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StickyPlayerBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { threshold: [1] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="h-px w-full shrink-0" aria-hidden />
      <div
        className={cn(
          "sticky top-0 z-30 -mx-4 space-y-3 border border-transparent bg-background/95 px-4 pb-3 backdrop-blur-sm transition-[border-radius,border-color,box-shadow,padding] duration-300 ease-out sm:-mx-0 sm:px-3 sm:pt-4",
          // Mobile: when pinned under the status bar, clear the iOS safe area.
          stuck
            ? "pt-[max(1rem,calc(env(safe-area-inset-top,0px)+0.5rem))]"
            : "pt-4",
          stuck
            ? "rounded-none border-b border-border/70 shadow-sm sm:rounded-t-none sm:rounded-b-xl"
            : "rounded-xl sm:rounded-xl",
          !stuck && "sm:border-border/70 sm:shadow-sm",
          className
        )}
      >
        {children}
      </div>
    </>
  );
}
