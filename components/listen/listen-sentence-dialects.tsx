"use client";

import type { Sentence } from "@/types/sentence";
import { useApp } from "@/components/providers/app-provider";
import { fieldsFromComposedSentence } from "@/lib/sentence-utils";
import {
  getAlternateTranslation,
  getPrimaryTranslation,
} from "@/lib/preferences/translation-preferences";
import { DialectTranslationBlock } from "@/components/sentence/dialect-translation-block";
import { Separator } from "@/components/ui/separator";
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

  const primaryFields =
    fieldsFromComposedSentence(sentence) ??
    getSentenceTranslation(sentence.id, primaryDialect);
  const alternateFields = alternateDialect
    ? getSentenceTranslation(sentence.id, alternateDialect)
    : null;

  // Only show alternate if it has a distinct Japanese form
  const hasAlternate = Boolean(
    alternateFields?.japanese?.trim() &&
      alternateFields.japanese.trim() !== primaryFields?.japanese?.trim()
  );
  const showDialectCompare = showKansai && hasAlternate;

  const readingClassName =
    variant === "shadow"
      ? "font-japanese text-lg text-muted"
      : "font-japanese text-base text-muted/80";
  const phoneticClassName = variant === "shadow" ? "text-lg" : "text-base";

  if (!primaryFields && !hasAlternate) return null;

  return (
    <div
      className={cn(
        "space-y-3",
        variant === "shadow" && "text-left",
        className
      )}
    >
      {primaryFields && (
        <DialectTranslationBlock
          sentenceId={sentence.id}
          fields={primaryFields}
          dialect={primaryDialect}
          sentenceMeta={sentence}
          showLabel={showDialectCompare}
          showPlayButton={showDialectCompare}
          showJapanese={false}
          showRomaji={false}
          readingClassName={readingClassName}
          phoneticClassName={phoneticClassName}
        />
      )}

      {showDialectCompare && alternateDialect && alternateFields && (
        <>
          <Separator className="opacity-60" />
          <DialectTranslationBlock
            sentenceId={sentence.id}
            fields={alternateFields}
            dialect={alternateDialect}
            sentenceMeta={sentence}
            showLabel
            showPlayButton
            showJapanese
            showRomaji={false}
            japaneseClassName={variant === "shadow" ? "text-xl" : "text-lg"}
            readingClassName={readingClassName}
            phoneticClassName={variant === "shadow" ? "text-base" : "text-sm"}
          />
        </>
      )}
    </div>
  );
}
