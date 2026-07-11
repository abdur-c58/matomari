"use client";

import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SyncStatus = "idle" | "syncing" | "offline" | "error";

export function SyncIndicator({
  status,
  className,
}: {
  status: SyncStatus;
  className?: string;
}) {
  if (status === "idle") return null;

  const config = {
    syncing: {
      icon: Loader2,
      label: "Syncing",
      className: "text-muted",
      spin: true,
    },
    offline: {
      icon: CloudOff,
      label: "Offline",
      className: "text-muted",
      spin: false,
    },
    error: {
      icon: Cloud,
      label: "Sync error",
      className: "text-destructive",
      spin: false,
    },
  }[status];

  if (!config) return null;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium shadow-sm",
        config.className,
        className
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", config.spin && "animate-spin")} />
      {config.label}
    </span>
  );
}
