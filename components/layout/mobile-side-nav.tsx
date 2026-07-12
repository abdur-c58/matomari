"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTutor } from "@/components/ai/tutor-provider";
import {
  footerNav,
  isNavActive,
  primaryNav,
  toolsNav,
} from "@/components/layout/app-nav-config";
import { AppBrandHeader } from "@/components/layout/app-brand-header";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const HOVER_CLOSE_DELAY_MS = 200;

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
  compact,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate: () => void;
  compact?: boolean;
}) {
  return (
    <SheetClose asChild>
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 font-medium transition-colors duration-150 touch-manipulation",
          compact ? "h-8 text-xs" : "h-10 text-sm",
          active
            ? "bg-foreground/10 text-foreground"
            : "text-muted hover:bg-foreground/5 hover:text-foreground"
        )}
      >
        <Icon className={cn("shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")} strokeWidth={active ? 2.25 : 2} />
        {label}
      </Link>
    </SheetClose>
  );
}

export function MobileSideNav() {
  const pathname = usePathname();
  const { openTutor } = useTutor();
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverCapableRef = useRef(false);

  useEffect(() => {
    hoverCapableRef.current = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    if (!hoverCapableRef.current) return;
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  const handleOpen = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  const handleTutor = useCallback(() => {
    setOpen(false);
    openTutor({ type: "general" });
  }, [openTutor]);

  return (
    <>
      <div
        className="fixed right-0 top-1/2 z-40 -translate-y-1/2"
        onMouseEnter={handleOpen}
        onMouseLeave={scheduleClose}
      >
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-l-xl border border-r-0 border-border bg-background px-2 py-3 shadow-md touch-manipulation transition-colors",
            open && "bg-foreground/5"
          )}
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted [writing-mode:vertical-rl] rotate-180">
            Menu
          </span>
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-[min(85vw,18rem)] flex-col gap-0 overflow-hidden p-0"
          onMouseEnter={handleOpen}
          onMouseLeave={scheduleClose}
        >
          <SheetHeader className="shrink-0 border-b border-border px-4 pb-3 pr-14 pt-[max(0.5rem,calc(env(safe-area-inset-top,0px)+0.375rem))]">
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <AppBrandHeader variant="mobile" className="w-full min-w-0" />
          </SheetHeader>

          <div className="relative min-h-0 flex-1">
            <nav
              className="h-full overflow-y-auto overscroll-contain px-3 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]"
              aria-label="Main navigation"
            >
              <div className="space-y-0.5">
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Study
                </p>
                {primaryNav.map(({ href, label, icon }) => (
                  <NavLink
                    key={href}
                    href={href}
                    label={label}
                    icon={icon}
                    active={isNavActive(pathname, href)}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </div>

              <div className="mt-5 space-y-0.5">
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Tools
                </p>
                {toolsNav.map(({ href, label, icon }) => (
                  <NavLink
                    key={href}
                    href={href}
                    label={label}
                    icon={icon}
                    active={isNavActive(pathname, href)}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
                <button
                  type="button"
                  onClick={handleTutor}
                  className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted transition-colors duration-150 hover:bg-foreground/5 hover:text-foreground touch-manipulation"
                >
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  AI Assistant
                </button>
              </div>

              <div className="mt-5 border-t border-border pt-3">
                {footerNav.map(({ href, label, icon }) => (
                  <NavLink
                    key={href}
                    href={href}
                    label={label}
                    icon={icon}
                    active={pathname.startsWith(href)}
                    onNavigate={() => setOpen(false)}
                    compact
                  />
                ))}
              </div>
            </nav>

            {/* Fade scroll-off at bottom — uses background token for light/dark */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background from-25% via-background/60 to-transparent"
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
