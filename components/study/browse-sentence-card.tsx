"use client";

import type { Dialect } from "@/lib/constants/dialect";
import { getDialectLabel } from "@/lib/constants/dialect";
import type { IslandBrowseDisplay } from "@/lib/constants/island-browse";
import type { Sentence, TranslatedFields } from "@/types/sentence";
import type { SentenceProgress } from "@/types/progress";
import { useApp } from "@/components/providers/app-provider";
import { fieldsFromComposedSentence, isTranslated } from "@/lib/sentence-utils";
import {
  getAlternateTranslation,
  getPrimaryTranslation,
} from "@/lib/preferences/translation-preferences";
import { dialectTranslationFieldsDiffer } from "@/lib/sentence/dialect-display";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/sentence/star-rating";
import { PlaceholderText } from "@/components/sentence/placeholder-text";
import { DialectTranslationBlock } from "@/components/sentence/dialect-translation-block";
import { SentenceAudioControls } from "@/components/audio/sentence-play-button";
import { cn } from "@/lib/utils";

const EXPAND_SPRING = { type: "spring" as const, stiffness: 380, damping: 28 };

function dialectShortLabel(dialect: Dialect): string {
  return dialect === "kansai" ? "Kansai" : "Standard";
}

function AnimatedExpand({
  show,
  children,
  className,
}: {
  show: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="expanded"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={EXPAND_SPRING}
          className={cn("overflow-hidden", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
function useBrowseDialectFields(sentence: Sentence) {
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

  const primaryFields =
    primaryDialect === "kansai"
      ? kansaiFields ?? standardFields
      : standardFields ?? kansaiFields;

  const secondaryDialect =
    alternateDialect && alternateDialect !== primaryDialect
      ? alternateDialect
      : null;
  const secondaryFields: TranslatedFields | null =
    secondaryDialect === "kansai"
      ? kansaiFields
      : secondaryDialect === "standard"
        ? standardFields
        : null;

  const showSecondary =
    secondaryDialect != null &&
    dialectTranslationFieldsDiffer(standardFields, kansaiFields);

  const primaryHasTranslation = Boolean(primaryFields?.japanese?.trim());
  const secondaryHasTranslation = Boolean(secondaryFields?.japanese?.trim());

  return {
    primaryDialect,
    secondaryDialect,
    primaryFields,
    secondaryFields,
    showSecondary,
    primaryHasTranslation,
    secondaryHasTranslation,
  };
}

function ExpandCollapseActions({
  expandLabel,
  isExpanded,
  onExpand,
  onCollapse,
}: {
  expandLabel: string | null;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}) {
  if (!expandLabel && !isExpanded) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {expandLabel && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-long-press-ignore
          className="h-7 w-fit shrink-0 pl-0 pr-1.5 text-xs text-muted hover:bg-transparent hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
        >
          {expandLabel}
        </Button>
      )}
      {expandLabel && isExpanded && (
        <span className="select-none text-xs text-border" aria-hidden>
          ·
        </span>
      )}
      {isExpanded && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-long-press-ignore
          className="h-7 w-fit shrink-0 px-1.5 text-xs text-muted hover:bg-transparent hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onCollapse();
          }}
          >
          Collapse
        </Button>
      )}
    </div>
  );
}

function EnDialectSection({
  sentence,
  fields,
  dialect,
}: {
  sentence: Sentence;
  fields: TranslatedFields;
  dialect: Dialect;
}) {
  const placeholders = fields.placeholders ?? sentence.placeholders;

  return (
    <section
      className="rounded-md border border-border/60 bg-surface/30 px-2.5 py-2"
      aria-label={dialectShortLabel(dialect)}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <Badge variant="outline" className="h-5 px-2 text-[10px] font-medium">
          {dialectShortLabel(dialect)}
        </Badge>
        <SentenceAudioControls
          sentenceId={sentence.id}
          japanese={fields.japanese}
          reading={fields.reading}
          phonetic_reading={fields.phonetic_reading}
          register={sentence.register}
          tags={sentence.tags}
          context_notes={sentence.context_notes}
          english={sentence.english}
          placeholders={placeholders}
          dialect={dialect}
          appearance="minimal"
        />
      </div>
      <DialectTranslationBlock
        sentenceId={sentence.id}
        fields={fields}
        dialect={dialect}
        sentenceMeta={sentence}
        showLabel={false}
        showPlayButton={false}
        showJapanese
        showRomaji={false}
        japaneseClassName="text-xs text-muted"
        readingClassName="text-[11px]"
        phoneticClassName="text-[11px]"
      />
    </section>
  );
}

export function BrowseSentenceCard({
  sentence,
  progress,
  displayMode,
  expansionStep,
  onExpand,
  onCollapse,
  onRate,
  suggestedRating,
}: {
  sentence: Sentence;
  progress?: SentenceProgress | null;
  displayMode: IslandBrowseDisplay;
  expansionStep: number;
  onExpand: () => void;
  onCollapse: () => void;
  onRate?: (rating: number) => void;
  suggestedRating?: number | null;
}) {
  const {
    primaryDialect,
    secondaryDialect,
    primaryFields,
    secondaryFields,
    showSecondary,
    primaryHasTranslation,
    secondaryHasTranslation,
  } = useBrowseDialectFields(sentence);

  const mastered = progress?.rating === 5;
  const showEnglish = displayMode === "en" || displayMode === "both";
  const isJpOnly = displayMode === "jp";
  const isEnOnly = displayMode === "en";

  const expandLabel = (() => {
    if (displayMode === "both") {
      if (expansionStep >= 1 || !showSecondary || !secondaryDialect) return null;
      return `Show ${getDialectLabel(secondaryDialect)}`;
    }
    if (displayMode === "en") {
      if (expansionStep === 0) return "Show translation";
      if (expansionStep === 1 && showSecondary && secondaryDialect) {
        return `Show ${getDialectLabel(secondaryDialect)}`;
      }
      return null;
    }
    if (displayMode === "jp") {
      if (expansionStep >= 1) return null;
      return "Show translation";
    }
    return null;
  })();

  const compactHeaderTitleClass = "m-0 leading-[1.2]";

  return (
    <div
      className={cn(
        "browse-sentence-card overflow-hidden rounded-xl border border-border/55 bg-surface-raised/60 shadow-none",
        isJpOnly || isEnOnly ? "px-3.5 py-3" : "p-4",
        mastered && "mastered-card"
      )}
    >
      <div className={cn("flex flex-col", isJpOnly || isEnOnly ? "gap-2" : "gap-2.5")}>
        {showEnglish && (
          <div
            className={cn(
              "flex gap-3",
              isEnOnly
                ? "items-center justify-between"
                : "items-start justify-between"
            )}
          >
            <div className="min-w-0 flex-1">
              <PlaceholderText
                text={sentence.english}
                sentence={sentence}
                as="p"
                className={cn(
                  isEnOnly
                    ? cn(compactHeaderTitleClass, "text-base text-foreground")
                    : "line-clamp-2 text-sm leading-relaxed text-muted"
                )}
              />
            </div>
            {onRate && (
              <div
                data-long-press-ignore
                data-sentence-rating
                className="flex shrink-0 items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <StarRating
                  value={progress?.rating ?? null}
                  onChange={onRate}
                  suggested={suggestedRating}
                  size="xs"
                  compact
                />
              </div>
            )}
          </div>
        )}

        {isEnOnly && expansionStep === 0 && (
          <ExpandCollapseActions
            expandLabel={expandLabel}
            isExpanded={false}
            onExpand={onExpand}
            onCollapse={onCollapse}
          />
        )}

        {displayMode === "both" && (
          <>
            {primaryHasTranslation && primaryFields ? (
              <DialectTranslationBlock
                sentenceId={sentence.id}
                fields={primaryFields}
                dialect={primaryDialect}
                sentenceMeta={sentence}
                showLabel={false}
                showPlayButton
                showJapanese
                showRomaji={false}
                className="w-full"
                japaneseClassName="text-[0.95rem] leading-relaxed"
                readingClassName="text-xs"
                phoneticClassName="text-xs"
              />
            ) : (
              <Badge variant="secondary" className="text-xs">
                Not yet translated
              </Badge>
            )}

            <AnimatedExpand
              show={expansionStep >= 1 && Boolean(showSecondary && secondaryDialect)}
            >
              <div className="space-y-2 border-t border-border/40 pt-3">
                {secondaryHasTranslation && secondaryFields ? (
                  <DialectTranslationBlock
                    sentenceId={sentence.id}
                    fields={secondaryFields}
                    dialect={secondaryDialect!}
                    sentenceMeta={sentence}
                    showLabel
                    showPlayButton
                    showJapanese
                    showRomaji={secondaryDialect === "kansai"}
                    groupKansaiPronunciation={secondaryDialect === "kansai"}
                    className="w-full"
                    japaneseClassName="text-[0.95rem] leading-relaxed"
                    readingClassName="text-xs"
                    phoneticClassName="text-xs"
                    romajiClassName="text-xs"
                  />
                ) : secondaryDialect ? (
                  <p className="text-xs text-muted">
                    No {getDialectLabel(secondaryDialect).toLowerCase()} translation yet.
                  </p>
                ) : null}
              </div>
            </AnimatedExpand>
          </>
        )}

        <AnimatedExpand show={displayMode === "en" && expansionStep >= 1}>
          <div className="space-y-2 border-t border-border/40 pt-3">
            {primaryHasTranslation && primaryFields && (
              <EnDialectSection
                sentence={sentence}
                fields={primaryFields}
                dialect={primaryDialect}
              />
            )}
            <AnimatedExpand
              show={
                expansionStep >= 2 &&
                Boolean(showSecondary && secondaryDialect && secondaryHasTranslation && secondaryFields)
              }
            >
              {secondaryFields && secondaryDialect && (
                <EnDialectSection
                  sentence={sentence}
                  fields={secondaryFields}
                  dialect={secondaryDialect}
                />
              )}
            </AnimatedExpand>
          </div>
        </AnimatedExpand>

        {displayMode === "jp" && (
          <>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {primaryHasTranslation && primaryFields ? (
                    <DialectTranslationBlock
                      sentenceId={sentence.id}
                      fields={primaryFields}
                      dialect={primaryDialect}
                      sentenceMeta={sentence}
                      showLabel={false}
                      showPlayButton={false}
                      showJapanese
                      showReading={false}
                      showRomaji={false}
                      className="space-y-0"
                      japaneseClassName={cn(
                        compactHeaderTitleClass,
                        "text-base"
                      )}
                      readingClassName="text-xs"
                      phoneticClassName="text-xs"
                    />
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Not yet translated
                    </Badge>
                  )}
                </div>
                {(onRate || (primaryHasTranslation && primaryFields)) && (
                  <div className="flex shrink-0 items-center gap-2">
                    {onRate && (
                      <div
                        data-long-press-ignore
                        data-sentence-rating
                        onClick={(e) => e.stopPropagation()}
                      >
                        <StarRating
                          value={progress?.rating ?? null}
                          onChange={onRate}
                          suggested={suggestedRating}
                          size="xs"
                          compact
                        />
                      </div>
                    )}
                    {primaryHasTranslation && primaryFields && (
                      <SentenceAudioControls
                        sentenceId={sentence.id}
                        japanese={primaryFields.japanese}
                        reading={primaryFields.reading}
                        phonetic_reading={primaryFields.phonetic_reading}
                        register={sentence.register}
                        tags={sentence.tags}
                        context_notes={sentence.context_notes}
                        english={sentence.english}
                        placeholders={primaryFields.placeholders ?? sentence.placeholders}
                        dialect={primaryDialect}
                      />
                    )}
                  </div>
                )}
              </div>
              <ExpandCollapseActions
                expandLabel={expandLabel}
                isExpanded={expansionStep > 0}
                onExpand={onExpand}
                onCollapse={onCollapse}
              />
            </div>

            <AnimatedExpand show={expansionStep >= 1}>
              <PlaceholderText
                text={sentence.english}
                sentence={sentence}
                as="p"
                className="border-t border-border/40 pt-2 text-xs leading-relaxed text-muted"
              />
            </AnimatedExpand>
          </>
        )}

        {(displayMode === "both" || (isEnOnly && expansionStep >= 1)) && (
          <ExpandCollapseActions
            expandLabel={expandLabel}
            isExpanded={expansionStep > 0}
            onExpand={onExpand}
            onCollapse={onCollapse}
          />
        )}
      </div>
    </div>
  );
}
