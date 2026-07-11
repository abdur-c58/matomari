"use client";

import { useEffect, useState } from "react";
import {
  onUploadProgressChange,
  type UploadProgressState,
} from "@/lib/upload-progress";
import { cn } from "@/lib/utils";

export function UploadProgressBar() {
  const [progress, setProgress] = useState<UploadProgressState>({
    active: false,
    label: "",
    completed: 0,
    total: 0,
  });

  useEffect(() => onUploadProgressChange(setProgress), []);

  if (!progress.active) return null;

  const pct =
    progress.total > 0 && !progress.indeterminate
      ? Math.min(100, Math.round((progress.completed / progress.total) * 100))
      : 0;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] border-b border-border bg-surface/95 backdrop-blur-xl pt-[env(safe-area-inset-top,0px)]"
      role="status"
      aria-live="polite"
      aria-label={progress.label}
    >
      <div className="h-0.5 w-full overflow-hidden bg-border">
        <div
          className={cn(
            "h-full bg-foreground",
            progress.indeterminate
              ? "w-1/3 animate-[upload-indeterminate_1.2s_ease-in-out_infinite]"
              : "transition-[width] duration-300 ease-out"
          )}
          style={progress.indeterminate ? undefined : { width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <div className="min-w-0 text-left">
          <p className="truncate text-xs font-medium text-foreground">{progress.label}</p>
          {progress.subtitle && (
            <p className="truncate text-[11px] text-muted">{progress.subtitle}</p>
          )}
        </div>
        {!progress.indeterminate && progress.total > 0 && (
          <p className="shrink-0 text-xs tabular-nums text-muted">
            {progress.completed} / {progress.total}
          </p>
        )}
      </div>
    </div>
  );
}
