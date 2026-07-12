"use client";

import { useCallback, useState } from "react";
import { Languages } from "lucide-react";
import type { Dialect } from "@/lib/constants/dialect";
import { useApp } from "@/components/providers/app-provider";
import { TranslationProgress } from "@/components/layout/translation-progress";
import { Button } from "@/components/ui/button";
import { TranslationError } from "@/lib/services/translation-service";
import { getPrimaryTranslation } from "@/lib/preferences/translation-preferences";
import { toast } from "sonner";

function formatTranslationError(error: unknown): string {
  if (error instanceof TranslationError && error.code === "NOT_CONFIGURED") {
    return "AI is not configured. Add OPENAI_API_KEY to translate sentences.";
  }
  if (error instanceof Error) return error.message;
  return "Translation failed";
}

function useTranslateAllRun(dialect: Dialect) {
  const { dataset, translateAllUntranslated } = useApp();
  const [translating, setTranslating] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const runTranslation = useCallback(async () => {
    if (!dataset) return;

    setError(null);
    setTranslating(true);
    setProgress({ completed: 0, total: 0 });

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
  }, [dataset, dialect, translateAllUntranslated]);

  return { translating, progress, error, runTranslation, setTranslating };
}

export function TranslateAllButton({
  variant = "overlay",
}: {
  variant?: "overlay" | "inline";
}) {
  const { getUntranslatedCount, progress: userProgress } = useApp();
  const dialect = getPrimaryTranslation(userProgress.settings);
  const untranslatedCount = getUntranslatedCount(dialect);
  const { translating, progress, error, runTranslation, setTranslating } =
    useTranslateAllRun(dialect);

  if (untranslatedCount === 0) return null;

  if (translating && variant === "overlay") {
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

export function TranslateKansaiAllButton() {
  const { getUntranslatedCount, progress: userProgress } = useApp();
  const showKansai = userProgress.settings.showKansaiDialect ?? false;
  const untranslatedCount = getUntranslatedCount("kansai");
  const { translating, progress, error, runTranslation, setTranslating } =
    useTranslateAllRun("kansai");

  if (!showKansai || untranslatedCount === 0) return null;

  if (translating) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 px-4 backdrop-blur-sm">
        <TranslationProgress
          completed={progress.completed}
          total={progress.total}
          error={error}
          onRetry={error ? runTranslation : undefined}
          title="Translating Kansai…"
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
    <Button variant="outline" size="sm" onClick={runTranslation}>
      <Languages className="mr-2 h-4 w-4" />
      Translate Kansai ({untranslatedCount})
    </Button>
  );
}
