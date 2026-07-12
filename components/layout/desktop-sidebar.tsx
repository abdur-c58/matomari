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
  ClipboardList,
  AlertTriangle,
} from "lucide-react";
import { useTutor } from "@/components/ai/tutor-provider";
import { AppBrandHeader } from "@/components/layout/app-brand-header";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/", label: "Today", icon: Calendar },
  { href: "/batch", label: "Study", icon: Layers },
  { href: "/recall", label: "Active Recall", icon: Brain },
  { href: "/listen?step=shadow", label: "Shadowing", icon: Headphones },
  { href: "/library", label: "Library", icon: Library },
  { href: "/progress", label: "Progress", icon: BarChart3 },
] as const;

const toolsNav = [
  { href: "/prepare", label: "Pre-study", icon: ClipboardList },
  { href: "/weak", label: "Weak sentences", icon: AlertTriangle },
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
    <aside className="flex h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface lg:w-64">
      <div className="border-b border-border px-5 py-5">
        <AppBrandHeader variant="sidebar" />
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Study
          </p>
          {primaryNav.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted hover:bg-foreground/5 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.25 : 2} />
                {label}
              </Link>
            );
          })}
        </div>

        <div className="space-y-0.5">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Tools
          </p>
          {toolsNav.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted hover:bg-foreground/5 hover:text-foreground"
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
            className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted transition-colors duration-150 hover:bg-foreground/5 hover:text-foreground"
          >
            <MessageCircle className="h-4 w-4 shrink-0" />
            AI Assistant
          </button>
        </div>
      </nav>

      <div className="border-t border-border px-3 py-3">
        {footerNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex h-8 items-center gap-3 rounded-lg px-3 text-xs font-medium transition-colors duration-150",
              pathname.startsWith(href)
                ? "text-foreground"
                : "text-muted hover:bg-foreground/5 hover:text-foreground"
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
