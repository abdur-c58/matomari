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
  const hasAlternate = Boolean(alternateFields?.japanese?.trim());
  const showDialectCompare = showKansai && hasAlternate;

  const readingClassName =
    variant === "shadow"
      ? "font-japanese text-lg text-muted"
      : "font-japanese text-base text-muted/80";
  const phoneticClassName = variant === "shadow" ? "text-lg" : "text-base";
  const romajiClassName = variant === "shadow" ? "text-base" : "text-sm";

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
          readingClassName={readingClassName}
          phoneticClassName={phoneticClassName}
          romajiClassName={romajiClassName}
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
            japaneseClassName={variant === "shadow" ? "text-xl" : "text-lg"}
            readingClassName={readingClassName}
            phoneticClassName={variant === "shadow" ? "text-base" : "text-sm"}
            romajiClassName="text-sm"
          />
        </>
      )}
    </div>
  );
}
