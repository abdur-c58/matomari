"use client";

import type { Sentence } from "@/types/sentence";
import { useApp } from "@/components/providers/app-provider";
import { fieldsFromComposedSentence } from "@/lib/sentence-utils";
import {
  getAlternateTranslation,
  getPrimaryTranslation,
} from "@/lib/preferences/translation-preferences";
import { dialectTranslationFieldsDiffer } from "@/lib/sentence/dialect-display";
import { DialectTranslationBlock } from "@/components/sentence/dialect-translation-block";
import { cn } from "@/lib/utils";

type ListenSentenceDialectsProps = {
  sentence: Sentence;
  variant?: "shadow" | "meaning";
  className?: string;
};

export function ListenSentenceDialects({
  sentence,
  variant = "shadow",
  className,
}: ListenSentenceDialectsProps) {
  const { progress, getSentenceTranslation } = useApp();
  const primaryDialect = getPrimaryTranslation(progress.settings);
  const alternateDialect = getAlternateTranslation(progress.settings);
  const showKansai = progress.settings.showKansaiDialect ?? false;

  const standardFields =
    getSentenceTranslation(sentence.id, "standard") ??
    (primaryDialect === "standard" ? fieldsFromComposedSentence(sentence) : null);
  const kansaiFields =
    getSentenceTranslation(sentence.id, "kansai") ??
    (primaryDialect === "kansai" ? fieldsFromComposedSentence(sentence) : null);

  const primaryFields = primaryDialect === "kansai" ? kansaiFields : standardFields;
  const alternateFields = alternateDialect === "kansai" ? kansaiFields : standardFields;

  const showDialectCompare =
    showKansai &&
    alternateDialect != null &&
    dialectTranslationFieldsDiffer(standardFields, kansaiFields);

  const readingClassName =
    variant === "shadow"
      ? "font-japanese text-lg text-muted"
      : "font-japanese text-base text-muted/80";
  const phoneticClassName = variant === "shadow" ? "text-lg" : "text-base";

  if (!primaryFields && !alternateFields) return null;

  const sectionClass =
    "rounded-lg border border-border/70 bg-surface/40 p-3";

  return (
    <div
      className={cn(
        "space-y-3",
        variant === "shadow" && "text-left",
        className
      )}
    >
      {primaryFields && (
        <section className={sectionClass} aria-label={showDialectCompare ? "Standard Japanese" : undefined}>
          {showDialectCompare && (
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {primaryDialect === "standard" ? "Standard Japanese" : "Kansai dialect"}
            </p>
          )}
          <DialectTranslationBlock
            sentenceId={sentence.id}
            fields={primaryFields}
            dialect={primaryDialect}
            sentenceMeta={sentence}
            showLabel={false}
            showPlayButton={showDialectCompare}
            showJapanese={!showDialectCompare || primaryDialect === "kansai"}
            showRomaji={false}
            groupKansaiPronunciation={primaryDialect === "kansai"}
            readingClassName={readingClassName}
            phoneticClassName={phoneticClassName}
          />
        </section>
      )}

      {showDialectCompare && alternateDialect && alternateFields && (
        <section className={sectionClass} aria-label={alternateDialect === "kansai" ? "Kansai dialect" : "Standard Japanese"}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
            {alternateDialect === "kansai" ? "Kansai dialect" : "Standard Japanese"}
          </p>
          <DialectTranslationBlock
            sentenceId={sentence.id}
            fields={alternateFields}
            dialect={alternateDialect}
            sentenceMeta={sentence}
            showLabel={false}
            showPlayButton
            showJapanese
            showRomaji={false}
            groupKansaiPronunciation={alternateDialect === "kansai"}
            japaneseClassName={variant === "shadow" ? "text-xl" : "text-lg"}
            readingClassName={readingClassName}
            phoneticClassName={variant === "shadow" ? "text-base" : "text-sm"}
          />
        </section>
      )}
    </div>
  );
}
