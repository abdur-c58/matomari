"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSmoothScroll } from "@/components/marketing/motion/smooth-scroll-provider";
import {
  MARKETING_SECTION_LINKS,
  scrollToMarketingSection,
  type MarketingSectionId,
} from "@/components/marketing/motion/scroll-to-section";
import { cn } from "@/lib/utils";

export function MarketingSectionRail() {
  const { lenis, ready } = useSmoothScroll();
  const [activeId, setActiveId] = useState<MarketingSectionId>("hero");

  const activeIndex = useMemo(() => {
    const index = MARKETING_SECTION_LINKS.findIndex((link) => link.id === activeId);
    return index >= 0 ? index : 0;
  }, [activeId]);

  const activeLabel = MARKETING_SECTION_LINKS[activeIndex]?.label ?? "Home";

  useEffect(() => {
    if (!ready) return;

    const elements = MARKETING_SECTION_LINKS.map((link) =>
      document.getElementById(link.id)
    ).filter((el): el is HTMLElement => Boolean(el));

    if (!elements.length) return;

    const visibility = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibility.set(entry.target.id, entry.intersectionRatio);
        }

        let bestId: MarketingSectionId = "hero";
        let bestRatio = 0;
        for (const link of MARKETING_SECTION_LINKS) {
          const ratio = visibility.get(link.id) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = link.id;
          }
        }

        // Keep the last known section when ratios briefly drop during pin transitions.
        if (bestRatio >= 0.12) {
          setActiveId(bestId);
        }
      },
      {
        root: null,
        threshold: [0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 1],
        rootMargin: "-22% 0px -38% 0px",
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

  const goRelative = useCallback(
    (delta: -1 | 1) => {
      const nextIndex = Math.min(
        MARKETING_SECTION_LINKS.length - 1,
        Math.max(0, activeIndex + delta)
      );
      const next = MARKETING_SECTION_LINKS[nextIndex];
      if (next) scrollToSection(next.id);
    },
    [activeIndex, scrollToSection]
  );

  const atStart = activeIndex <= 0;
  const atEnd = activeIndex >= MARKETING_SECTION_LINKS.length - 1;

  return (
    <aside
      className="pointer-events-none fixed bottom-5 left-1/2 z-[60] hidden -translate-x-1/2 md:block"
      aria-label="Page sections"
    >
      <nav
        className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-border/60 bg-background/80 px-1.5 py-1.5 shadow-sm backdrop-blur-xl"
        aria-label="Jump to section"
      >
        <button
          type="button"
          data-cursor-interactive
          aria-label="Previous section"
          disabled={atStart}
          onClick={() => goRelative(-1)}
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl transition-[color,background-color,opacity,transform] duration-200",
            atStart
              ? "cursor-default text-muted/35 opacity-50"
              : "text-muted hover:bg-surface/80 hover:text-foreground"
          )}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>

        <div
          className="flex items-center gap-1 px-1"
          role="tablist"
          aria-label="Sections"
        >
          {MARKETING_SECTION_LINKS.map((link) => {
            const active = activeId === link.id;
            return (
              <button
                key={link.id}
                type="button"
                role="tab"
                data-cursor-interactive
                aria-label={link.label}
                aria-selected={active}
                title={link.label}
                onClick={() => scrollToSection(link.id)}
                className={cn(
                  "h-2.5 rounded-full transition-[width,background-color,transform] duration-300",
                  active
                    ? "w-6 bg-foreground"
                    : "w-2.5 bg-foreground/25 hover:scale-110 hover:bg-foreground/45"
                )}
              />
            );
          })}
        </div>

        <p
          className="min-w-[6.75rem] px-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground"
          aria-live="polite"
        >
          {activeLabel}
        </p>

        <button
          type="button"
          data-cursor-interactive
          aria-label="Next section"
          disabled={atEnd}
          onClick={() => goRelative(1)}
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl transition-[color,background-color,opacity,transform] duration-200",
            atEnd
              ? "cursor-default text-muted/35 opacity-50"
              : "text-muted hover:bg-surface/80 hover:text-foreground"
          )}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </nav>
    </aside>
  );
}
