"use client";

import type { Dialect } from "@/lib/constants/dialect";
import { getDialectLabel } from "@/lib/constants/dialect";
import type { Sentence, TranslatedFields } from "@/types/sentence";
import { useApp } from "@/components/providers/app-provider";
import { fieldsFromComposedSentence, isTranslated } from "@/lib/sentence-utils";
import {
  getAlternateTranslation,
  getPrimaryTranslation,
} from "@/lib/preferences/translation-preferences";
import { dialectTranslationFieldsDiffer } from "@/lib/sentence/dialect-display";
import { DialectTranslationBlock } from "@/components/sentence/dialect-translation-block";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SentenceDialectCompareProps = {
  sentence: Sentence;
  className?: string;
  showRomaji?: boolean;
  japaneseClassName?: string;
  readingClassName?: string;
  phoneticClassName?: string;
  romajiClassName?: string;
  onTranslate?: (dialect: Dialect) => void;
  translatingDialect?: Dialect | null;
  onRetranslate?: (dialect: Dialect) => void;
  retranslatingDialect?: Dialect | null;
  needsRetranslate?: (dialect: Dialect) => boolean;
};

function DialectSection({
  dialect,
  label,
  fields,
  sentence,
  showRomaji,
  classNames,
  onTranslate,
  translating,
  onRetranslate,
  retranslating,
  showRetranslate,
}: {
  dialect: Dialect;
  label: string;
  fields: TranslatedFields | null;
  sentence: Sentence;
  showRomaji?: boolean;
  classNames?: {
    japanese?: string;
    reading?: string;
    phonetic?: string;
    romaji?: string;
  };
  onTranslate?: () => void;
  translating?: boolean;
  onRetranslate?: () => void;
  retranslating?: boolean;
  showRetranslate?: boolean;
}) {
  const hasTranslation = Boolean(fields?.japanese?.trim());

  return (
    <section
      className="rounded-lg border border-border/70 bg-surface/40 p-3"
      aria-label={label}
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>

      {hasTranslation && fields ? (
        <>
          <DialectTranslationBlock
            sentenceId={sentence.id}
            fields={fields}
            dialect={dialect}
            sentenceMeta={sentence}
            showLabel={false}
            showRomaji={showRomaji ?? dialect === "kansai"}
            groupKansaiPronunciation={dialect === "kansai"}
            japaneseClassName={classNames?.japanese}
            readingClassName={classNames?.reading}
            phoneticClassName={classNames?.phonetic}
            romajiClassName={classNames?.romaji}
          />
          {showRetranslate && onRetranslate && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 px-2 text-xs"
              disabled={retranslating}
              onClick={onRetranslate}
            >
              Re-translate
            </Button>
          )}
        </>
      ) : (
        <div className="rounded-md border border-dashed border-border/80 p-2.5">
          <p className="text-xs text-muted">
            No {label.toLowerCase()} translation yet.
          </p>
          {onTranslate && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-2 h-7 text-xs"
              disabled={translating}
              onClick={onTranslate}
            >
              Translate {dialect === "kansai" ? "Kansai" : "Standard"}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

export function SentenceDialectCompare({
  sentence,
  className,
  showRomaji = true,
  japaneseClassName,
  readingClassName,
  phoneticClassName,
  romajiClassName,
  onTranslate,
  translatingDialect,
  onRetranslate,
  retranslatingDialect,
  needsRetranslate,
}: SentenceDialectCompareProps) {
  const { progress, getSentenceTranslation } = useApp();
  const primaryDialect = getPrimaryTranslation(progress.settings);
  const alternateDialect = getAlternateTranslation(progress.settings);

  const standardFields =
    getSentenceTranslation(sentence.id, "standard") ??
    (primaryDialect === "standard" && isTranslated(sentence)
      ? fieldsFromComposedSentence(sentence)
      : null);
  const kansaiFields =
    getSentenceTranslation(sentence.id, "kansai") ??
    (primaryDialect === "kansai" && isTranslated(sentence)
      ? fieldsFromComposedSentence(sentence)
      : null);

  const showBoth =
    alternateDialect != null &&
    dialectTranslationFieldsDiffer(standardFields, kansaiFields);

  const classNames = {
    japanese: japaneseClassName,
    reading: readingClassName,
    phonetic: phoneticClassName,
    romaji: romajiClassName,
  };

  if (!showBoth) {
    const dialect = primaryDialect;
    const fields =
      dialect === "kansai"
        ? kansaiFields ?? standardFields
        : standardFields ?? kansaiFields;

    return (
      <DialectSection
        dialect={dialect}
        label={getDialectLabel(dialect)}
        fields={fields}
        sentence={sentence}
        showRomaji={showRomaji}
        classNames={classNames}
        onTranslate={onTranslate ? () => onTranslate(dialect) : undefined}
        translating={translatingDialect === dialect}
        onRetranslate={onRetranslate ? () => onRetranslate(dialect) : undefined}
        retranslating={retranslatingDialect === dialect}
        showRetranslate={needsRetranslate?.(dialect)}
      />
    );
  }

  return (
    <div className={cn("grid gap-3", className)}>
      <DialectSection
        dialect="standard"
        label="Standard Japanese"
        fields={standardFields}
        sentence={sentence}
        showRomaji={false}
        classNames={classNames}
        onTranslate={onTranslate ? () => onTranslate("standard") : undefined}
        translating={translatingDialect === "standard"}
        onRetranslate={onRetranslate ? () => onRetranslate("standard") : undefined}
        retranslating={retranslatingDialect === "standard"}
        showRetranslate={needsRetranslate?.("standard")}
      />
      <DialectSection
        dialect="kansai"
        label="Kansai dialect"
        fields={kansaiFields}
        sentence={sentence}
        showRomaji={showRomaji}
        classNames={classNames}
        onTranslate={onTranslate ? () => onTranslate("kansai") : undefined}
        translating={translatingDialect === "kansai"}
        onRetranslate={onRetranslate ? () => onRetranslate("kansai") : undefined}
        retranslating={retranslatingDialect === "kansai"}
        showRetranslate={needsRetranslate?.("kansai")}
      />
    </div>
  );
}
