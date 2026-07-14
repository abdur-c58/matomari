"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function TranslationProgress({
  completed,
  total,
  error,
  onRetry,
  title = "Translating sentences…",
  subtitle,
  compact = false,
}: {
  completed: number;
  total: number;
  error?: string | null;
  onRetry?: () => void;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-5 text-center",
        compact ? "py-4" : "min-h-[40dvh] justify-center py-8"
      )}
    >
      {error ? (
        <>
          <div className="w-full max-w-sm space-y-3 rounded-2xl border border-border/70 bg-surface-raised/80 px-4 py-4 text-left">
            <p className="text-sm font-medium text-foreground">Paused translation</p>
            {total > 0 && (
              <p className="text-xs tabular-nums text-muted">
                Saved {completed} of {total} so far
              </p>
            )}
            <p className="text-sm leading-relaxed text-muted">{error}</p>
          </div>
          {onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          )}
        </>
      ) : (
        <>
          <div className="w-full max-w-xs space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">{title}</p>
              {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-foreground transition-[width] duration-300 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs tabular-nums text-muted">
              {completed} / {total}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
