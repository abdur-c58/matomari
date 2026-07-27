"use client";

import { useCallback, useState } from "react";
import { Languages } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { TranslationProgress } from "@/components/layout/translation-progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TranslationError } from "@/lib/services/translation-service";
import { getPrimaryTranslation } from "@/lib/preferences/translation-preferences";
import { toast } from "sonner";
import type { Dialect } from "@/lib/constants/dialect";

function formatTranslationError(error: unknown): string {
  if (error instanceof TranslationError && error.code === "NOT_CONFIGURED") {
    return "AI is not configured yet. Add OPENAI_API_KEY in .env.local to translate sentences.";
  }
  if (error instanceof Error) {
    const msg = error.message;
    if (/quota|rate limit|429|billing/i.test(msg)) {
      return msg;
    }
    return msg || "Translation couldn’t finish. You can try again in a moment.";
  }
  return "Translation couldn’t finish. You can try again in a moment.";
}

function TranslateAllButtonDesktopInner({
  dialect,
  label,
  variant,
}: {
  dialect: Dialect;
  label: string;
  variant: "secondary" | "outline";
}) {
  const { dataset, getUntranslatedCount, translateAllUntranslated } = useApp();
  const untranslatedCount = getUntranslatedCount(dialect);
  const [translating, setTranslating] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const dialogOpen = translating || Boolean(error);

  const dismiss = useCallback(() => {
    setTranslating(false);
    setError(null);
  }, []);

  const runTranslation = useCallback(async () => {
    if (!dataset || (untranslatedCount === 0 && !error)) return;

    setError(null);
    setTranslating(true);
    setProgress({ completed: 0, total: Math.max(untranslatedCount, 1) });

    try {
      const { translatedCount, total } = await translateAllUntranslated({
        dialect,
        onProgress: (completed, totalCount) =>
          setProgress({ completed, total: totalCount }),
      });

      setTranslating(false);

      if (translatedCount === 0) {
        toast.info("All sentences are already translated");
      } else {
        toast.success(
          `Translated ${translatedCount} of ${total} sentence${total === 1 ? "" : "s"}`
        );
      }
    } catch (e) {
      setError(formatTranslationError(e));
      setTranslating(false);
    }
  }, [dataset, dialect, error, untranslatedCount, translateAllUntranslated]);

  if (untranslatedCount === 0 && !dialogOpen) return null;

  return (
    <>
      {untranslatedCount > 0 && (
        <Button variant={variant} size="sm" onClick={runTranslation}>
          <Languages className="mr-2 h-4 w-4" />
          {label} ({untranslatedCount})
        </Button>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) dismiss();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <TranslationProgress
            compact
            completed={progress.completed}
            total={progress.total}
            error={error}
            onRetry={error ? runTranslation : undefined}
            title={
              dialect === "kansai"
                ? "Translating Kansai…"
                : "Translating all sentences…"
            }
            subtitle="All scenes"
          />
          {error && (
            <Button variant="ghost" className="mt-2 w-full" onClick={dismiss}>
              Close
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TranslateAllButtonDesktop() {
  const { progress } = useApp();
  const dialect = getPrimaryTranslation(progress.settings);

  return (
    <TranslateAllButtonDesktopInner
      dialect={dialect}
      label="Translate all"
      variant="secondary"
    />
  );
}

export function TranslateKansaiAllButtonDesktop() {
  const { progress } = useApp();
  const showKansai = progress.settings.showKansaiDialect ?? false;
  if (!showKansai) return null;

  return (
    <TranslateAllButtonDesktopInner
      dialect="kansai"
      label="Translate Kansai"
      variant="outline"
    />
  );
}
