"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Layers, Library, BarChart3, Headphones } from "lucide-react";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { TutorPanelSlot } from "@/components/ai/tutor-provider";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Today", icon: Calendar },
  { href: "/batch", label: "Study", icon: Layers },
  { href: "/listen", label: "Listen", icon: Headphones, elevated: true },
  { href: "/library", label: "Library", icon: Library },
  { href: "/progress", label: "Progress", icon: BarChart3 },
];

export function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden md:h-dvh md:w-full md:flex-row">
      <DesktopSidebar />
      <div
        id="app-shell"
        className="flex min-h-0 flex-1 flex-col bg-background text-foreground md:min-w-0"
      >
        <main id="scrollable-content" className="scroll-touch">
          {children}
        </main>
        <nav
          id="bottom-nav"
          className="bottom-nav z-40 shrink-0 border-t border-border bg-background md:hidden"
        >
          <div className="mx-auto flex max-w-lg items-end justify-around px-2 pt-2">
            {navItems.map(({ href, label, icon: Icon, elevated }) => {
              const active =
                pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-1.5 text-xs touch-manipulation transition-colors duration-150",
                    elevated && "-mt-3",
                    active ? "text-foreground" : "text-muted hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-2xl transition-colors duration-150",
                      elevated
                        ? cn(
                            "h-12 w-12",
                            active
                              ? "bg-cta text-cta-foreground"
                              : "border-2 border-foreground bg-transparent text-foreground"
                          )
                        : "h-8 w-8",
                      active && !elevated && "bg-foreground/10"
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 2} />
                  </span>
                  <span className={cn("font-medium", elevated && "text-foreground")}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
      <TutorPanelSlot />
    </div>
  );
}
