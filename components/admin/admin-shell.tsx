"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, HeartPulse, Shield, Users } from "lucide-react";
import type { StaffRole } from "@/lib/auth/require-staff";
import { DesktopPageShell } from "@/components/layout/desktop-page-shell";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const staffLinks = [
  { href: "/admin/users", label: "Users", icon: Users, adminOnly: false },
  { href: "/admin/health", label: "System health", icon: HeartPulse, adminOnly: true },
  { href: "/admin/activity", label: "Activity log", icon: Activity, adminOnly: true },
] as const;

export function AdminShell({
  role,
  displayName,
  children,
}: {
  role: StaffRole;
  displayName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const links = staffLinks.filter((link) => !link.adminOnly || role === "admin");

  return (
    <DesktopPageShell className="max-w-[1200px]">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-sm font-medium text-muted">Internal tooling</p>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-foreground">
            <Shield className="h-6 w-6" />
            Admin
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted">
            <span>Signed in as {displayName}</span>
            <Badge variant={role === "admin" ? "warning" : "secondary"}>
              {role}
            </Badge>
          </div>
        </div>
        <nav className="flex flex-wrap gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== "/admin/users" && pathname.startsWith(href)) ||
              (href === "/admin/users" && pathname.startsWith("/admin/users"));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted hover:bg-foreground/5 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </DesktopPageShell>
  );
}
