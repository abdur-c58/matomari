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
    return "AI is not configured. Add OPENAI_API_KEY to translate sentences.";
  }
  if (error instanceof Error) return error.message;
  return "Translation failed";
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

  const runTranslation = useCallback(async () => {
    if (!dataset || untranslatedCount === 0) return;

    setError(null);
    setTranslating(true);
    setProgress({ completed: 0, total: untranslatedCount });

    try {
      const { translatedCount, total } = await translateAllUntranslated({
        dialect,
        onProgress: (completed, totalCount) =>
          setProgress({ completed, total: totalCount }),
      });

      if (translatedCount === 0) {
        toast.info("All sentences are already translated");
      } else {
        toast.success(
          `Translated ${translatedCount} of ${total} sentence${total === 1 ? "" : "s"}`
        );
      }
    } catch (e) {
      setError(formatTranslationError(e));
    } finally {
      setTranslating(false);
    }
  }, [dataset, dialect, untranslatedCount, translateAllUntranslated]);

  if (untranslatedCount === 0) return null;

  return (
    <>
      <Button variant={variant} size="sm" onClick={runTranslation}>
        <Languages className="mr-2 h-4 w-4" />
        {label} ({untranslatedCount})
      </Button>

      <Dialog open={translating} onOpenChange={(v) => !v && !error && setTranslating(false)}>
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
            subtitle="Main pathway and all islands"
          />
          {error && (
            <Button variant="ghost" className="mt-2 w-full" onClick={() => setTranslating(false)}>
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
