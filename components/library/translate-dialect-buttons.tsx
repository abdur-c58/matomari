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

function useTranslateAllRun(dialect: Dialect) {
  const { dataset, translateAllUntranslated } = useApp();
  const [translating, setTranslating] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const dismiss = useCallback(() => {
    setTranslating(false);
    setError(null);
  }, []);

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
  }, [dataset, dialect, translateAllUntranslated]);

  const showOverlay = translating || Boolean(error);

  return {
    translating,
    showOverlay,
    progress,
    error,
    runTranslation,
    dismiss,
  };
}

export function TranslateAllButton({
  variant = "overlay",
}: {
  variant?: "overlay" | "inline";
}) {
  const { getUntranslatedCount, progress: userProgress } = useApp();
  const dialect = getPrimaryTranslation(userProgress.settings);
  const untranslatedCount = getUntranslatedCount(dialect);
  const { showOverlay, progress, error, runTranslation, dismiss } =
    useTranslateAllRun(dialect);

  if (untranslatedCount === 0 && !showOverlay) return null;

  if (showOverlay && variant === "overlay") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 px-4 backdrop-blur-sm">
        <TranslationProgress
          completed={progress.completed}
          total={progress.total}
          error={error}
          onRetry={error ? runTranslation : undefined}
          title="Translating all sentences…"
          subtitle="All scenes"
        />
        {error && (
          <Button variant="ghost" className="mt-2" onClick={dismiss}>
            Back to library
          </Button>
        )}
      </div>
    );
  }

  if (untranslatedCount === 0) return null;

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
  const { showOverlay, progress, error, runTranslation, dismiss } =
    useTranslateAllRun("kansai");

  if ((!showKansai || untranslatedCount === 0) && !showOverlay) return null;

  if (showOverlay) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 px-4 backdrop-blur-sm">
        <TranslationProgress
          completed={progress.completed}
          total={progress.total}
          error={error}
          onRetry={error ? runTranslation : undefined}
          title="Translating Kansai…"
          subtitle="All scenes"
        />
        {error && (
          <Button variant="ghost" className="mt-2" onClick={dismiss}>
            Back to library
          </Button>
        )}
      </div>
    );
  }

  if (!showKansai || untranslatedCount === 0) return null;

  return (
    <Button variant="outline" size="sm" onClick={runTranslation}>
      <Languages className="mr-2 h-4 w-4" />
      Translate Kansai ({untranslatedCount})
    </Button>
  );
}
