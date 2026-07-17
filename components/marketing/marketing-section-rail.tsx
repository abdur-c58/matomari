"use client";

import { useCallback, useEffect, useState } from "react";
import { useSmoothScroll } from "@/components/marketing/motion/smooth-scroll-provider";
import {
  scrollToMarketingSection,
  type MarketingSectionId,
} from "@/components/marketing/motion/scroll-to-section";
import { cn } from "@/lib/utils";

const sectionLinks = [
  { id: "features", label: "Features" },
  { id: "narration", label: "Narration" },
  { id: "walkthrough", label: "Walkthrough" },
] as const satisfies ReadonlyArray<{ id: MarketingSectionId; label: string }>;

export function MarketingSectionRail() {
  const { lenis, ready } = useSmoothScroll();
  const [activeId, setActiveId] = useState<MarketingSectionId | null>(null);

  useEffect(() => {
    if (!ready) return;

    const elements = sectionLinks
      .map((link) => document.getElementById(link.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!elements.length) return;

    const visibility = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibility.set(entry.target.id, entry.intersectionRatio);
        }

        let bestId: MarketingSectionId | null = null;
        let bestRatio = 0;
        for (const link of sectionLinks) {
          const ratio = visibility.get(link.id) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = link.id;
          }
        }

        setActiveId(bestRatio >= 0.18 ? bestId : null);
      },
      {
        root: null,
        threshold: [0, 0.18, 0.35, 0.5, 0.65, 0.8, 1],
        rootMargin: "-18% 0px -42% 0px",
      }
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [ready]);

  const scrollToSection = useCallback(
    (id: MarketingSectionId) => {
      scrollToMarketingSection(id, lenis);
    },
    [lenis]
  );

  return (
    <aside
      className="pointer-events-none fixed bottom-5 right-5 z-30 hidden md:block"
      aria-label="Page sections"
    >
      <nav className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-border/60 bg-background/75 p-1.5 shadow-sm backdrop-blur-xl">
        {sectionLinks.map((link, index) => {
          const active = activeId === link.id;
          return (
            <button
              key={link.id}
              type="button"
              data-cursor-interactive
              aria-current={active ? "true" : undefined}
              onClick={() => scrollToSection(link.id)}
              className={cn(
                "group relative flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] transition-[color,background-color,transform,box-shadow] duration-300",
                active
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted hover:-translate-y-0.5 hover:bg-surface/80 hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "font-mono text-[9px] font-normal transition-colors",
                  active ? "text-background/65" : "text-muted/60"
                )}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{link.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
