"use client";

import { useMemo } from "react";
import { useApp } from "@/components/providers/app-provider";
import { getTodayCasualListenCount } from "@/lib/services/casual-listen-service";
import { cn } from "@/lib/utils";

export function CasualListenProgress({ className }: { className?: string }) {
  const { stats } = useApp();
  const count = useMemo(() => getTodayCasualListenCount(stats), [stats]);

  return (
    <div className={cn("rounded-xl border border-border/70 bg-surface-raised px-4 py-3", className)}>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">Casual listening today</span>
        <span className="tabular-nums text-muted">{count} unique sentence{count === 1 ? "" : "s"}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-mode-meaning transition-[width]"
          style={{ width: `${Math.min(100, count * 4)}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-muted">
        Browse playlists do not count toward your daily study checklist.
      </p>
    </div>
  );
}
