"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";

export function PreparingSentences({
  error,
  onRetry,
}: {
  error?: string | null;
  onRetry?: () => void;
}) {
  return (
    <PageShell>
      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 text-center">
        {error ? (
          <>
            <p className="text-sm text-destructive">{error}</p>
            {onRetry && (
              <Button variant="secondary" onClick={onRetry}>
                Retry
              </Button>
            )}
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-foreground" />
            <p className="text-sm text-muted">Preparing sentences…</p>
          </>
        )}
      </div>
    </PageShell>
  );
}
