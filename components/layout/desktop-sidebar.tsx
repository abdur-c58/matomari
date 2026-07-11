"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Brain,
  Calendar,
  Headphones,
  Layers,
  Library,
  MessageCircle,
  Settings,
  Upload,
} from "lucide-react";
import { useTutor } from "@/components/ai/tutor-provider";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/", label: "Today", icon: Calendar },
  { href: "/batch", label: "Study", icon: Layers },
  { href: "/recall", label: "Active Recall", icon: Brain },
  { href: "/listen?step=shadow", label: "Shadowing", icon: Headphones },
  { href: "/library", label: "Library", icon: Library },
  { href: "/progress", label: "Progress", icon: BarChart3 },
] as const;

const footerNav = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/guide", label: "Guide", icon: BookOpen },
  { href: "/import", label: "Import", icon: Upload },
] as const;

function isActive(pathname: string, href: string) {
  const path = href.split("?")[0];
  if (path === "/listen") return pathname.startsWith("/listen");
  return pathname === path || (path !== "/" && pathname.startsWith(path));
}

export function DesktopSidebar() {
  const pathname = usePathname();
  const { openTutor } = useTutor();

  return (
    <aside className="hidden md:flex md:w-56 md:shrink-0 lg:w-60 md:flex-col md:border-r md:border-border md:bg-surface">
      <div className="border-b border-border px-5 py-5">
        <p className="font-display text-lg font-bold tracking-tight text-foreground">Shima</p>
        <p className="text-xs text-muted">Japanese learning</p>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        {primaryNav.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150",
                active
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted md:hover:bg-foreground/5 md:hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.25 : 2} />
              {label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => openTutor({ type: "general" })}
          className="flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted transition-colors duration-150 md:hover:bg-foreground/5 md:hover:text-foreground"
        >
          <MessageCircle className="h-4 w-4 shrink-0" />
          AI Assistant
        </button>
      </nav>

      <div className="border-t border-border px-3 py-3">
        {footerNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex min-h-9 items-center gap-3 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors duration-150",
              pathname.startsWith(href)
                ? "text-foreground"
                : "text-muted md:hover:bg-foreground/5 md:hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
