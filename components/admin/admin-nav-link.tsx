"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shows an Admin nav link only for staff sessions. */
export function AdminNavLink({
  className,
  compact,
  onNavigate,
}: {
  className?: string;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/me")
      .then(async (res) => {
        if (cancelled) return;
        setVisible(res.ok);
      })
      .catch(() => {
        if (!cancelled) setVisible(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  const active = pathname.startsWith("/admin");

  return (
    <Link
      href="/admin/users"
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 font-medium transition-colors duration-150",
        compact ? "h-8 text-xs" : "h-9 text-sm",
        active
          ? "bg-foreground/10 text-foreground"
          : "text-muted hover:bg-foreground/5 hover:text-foreground",
        className
      )}
    >
      <Shield className={cn("shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
      Admin
    </Link>
  );
}
