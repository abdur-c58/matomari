"use client";

import { useCallback, useMemo, useState } from "react";
import { Languages } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { TranslationProgress } from "@/components/layout/translation-progress";
import { Button } from "@/components/ui/button";
import { TranslationError, getUntranslatedIds } from "@/lib/services/translation-service";
import { useRequireDialectBeforeTranslate } from "@/hooks/use-require-dialect";
import { toast } from "sonner";

function formatTranslationError(error: unknown): string {
  if (error instanceof TranslationError && error.code === "NOT_CONFIGURED") {
    return "AI is not configured. Add OPENAI_API_KEY to translate sentences.";
  }
  if (error instanceof Error) return error.message;
  return "Translation failed";
}

export function TranslateAllButton() {
  const { dataset, translateAllUntranslated } = useApp();
  const requireDialect = useRequireDialectBeforeTranslate();
  const [translating, setTranslating] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const untranslatedCount = useMemo(
    () => (dataset ? getUntranslatedIds(dataset).length : 0),
    [dataset]
  );

  const runTranslation = useCallback(async () => {
    if (!dataset || untranslatedCount === 0) return;
    if (!requireDialect()) return;

    setError(null);
    setTranslating(true);
    setProgress({ completed: 0, total: untranslatedCount });

    try {
      const { translatedCount, total } = await translateAllUntranslated({
        onProgress: (completed, total) => setProgress({ completed, total }),
      });

      if (translatedCount === 0) {
        toast.info("All sentences are already translated");
      } else {
        toast.success(
          `Translated ${translatedCount} of ${total} sentence${total === 1 ? "" : "s"}`
        );
      }
      setTranslating(false);
    } catch (e) {
      setError(formatTranslationError(e));
    }
  }, [dataset, untranslatedCount, translateAllUntranslated, requireDialect]);

  if (!dataset || untranslatedCount === 0) {
    return null;
  }

  if (translating) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 px-4 backdrop-blur-sm">
        <TranslationProgress
          completed={progress.completed}
          total={progress.total}
          error={error}
          onRetry={error ? runTranslation : undefined}
          title="Translating all sentences…"
          subtitle="Main pathway and all islands"
        />
        {error && (
          <Button variant="ghost" className="mt-2" onClick={() => setTranslating(false)}>
            Back to library
          </Button>
        )}
      </div>
    );
  }

  return (
    <Button variant="secondary" size="sm" onClick={runTranslation}>
      <Languages className="mr-2 h-4 w-4" />
      Translate all ({untranslatedCount})
    </Button>
  );
}
