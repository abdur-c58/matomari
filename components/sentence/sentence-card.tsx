"use client";

import { useState } from "react";
import type { Dialect } from "@/lib/constants/dialect";
import { getDialectLabel } from "@/lib/constants/dialect";
import type { Sentence } from "@/types/sentence";
import type { SentenceProgress } from "@/types/progress";
import { useApp } from "@/components/providers/app-provider";
import { fieldsFromComposedSentence, isTranslated } from "@/lib/sentence-utils";
import { getPrimaryTranslation } from "@/lib/preferences/translation-preferences";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "./star-rating";
import { PlaceholderText } from "./placeholder-text";
import { DialectTranslationBlock } from "./dialect-translation-block";
import { SentenceDialectCompare } from "./sentence-dialect-compare";
import { SentenceAudioControls } from "@/components/audio/sentence-play-button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CardVariant = "study" | "library" | "compact";

interface SentenceCardProps {
  sentence: Sentence;
  progress?: SentenceProgress | null;
  variant?: CardVariant;
  showJapanese?: boolean;
  showReading?: boolean;
  showEnglish?: boolean;
  showRomaji?: boolean;
  onRate?: (rating: number) => void;
  suggestedRating?: number | null;
  showRetranslate?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
}

export function SentenceCard({
  sentence,
  progress,
  variant = "library",
  showJapanese = true,
  showReading = true,
  showEnglish = true,
  showRomaji = false,
  onRate,
  suggestedRating,
  showRetranslate = false,
  selectionMode = false,
  selected = false,
}: SentenceCardProps) {
  const {
    retranslateSentence,
    translateSentenceIds,
    sentenceNeedsRetranslation,
    getSentenceTranslation,
    progress: userProgress,
  } = useApp();
  const [retranslatingDialect, setRetranslatingDialect] = useState<Dialect | null>(null);
  const [translatingDialect, setTranslatingDialect] = useState<Dialect | null>(null);
  const mastered = progress?.rating === 5;
  const translated = isTranslated(sentence);
  const primaryDialect = getPrimaryTranslation(userProgress.settings);
  const showKansaiDialect = userProgress.settings.showKansaiDialect ?? false;
  const primaryFields = fieldsFromComposedSentence(sentence);

  const viewFields =
    getSentenceTranslation(sentence.id, primaryDialect) ??
    (translated ? primaryFields : null);
  const viewHasTranslation = Boolean(viewFields?.japanese?.trim());

  const handleRetranslate = async (dialect: Dialect = primaryDialect) => {
    setRetranslatingDialect(dialect);
    try {
      await retranslateSentence(sentence.id, dialect);
      toast.success("Translation updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Retranslation failed");
    } finally {
      setRetranslatingDialect(null);
    }
  };

  const handleTranslate = async (dialect: Dialect) => {
    setTranslatingDialect(dialect);
    try {
      await translateSentenceIds([sentence.id], { dialect });
      toast.success(`${getDialectLabel(dialect)} translation added`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Translation failed");
    } finally {
      setTranslatingDialect(null);
    }
  };

  const compactPlayFields = viewFields;

  return (
    <Card
      mastered={mastered}
      variant={variant === "study" ? "elevated" : "default"}
      className={cn(
        variant === "compact" &&
          "rounded-xl border-border/55 bg-surface-raised/60 !p-0 shadow-none",
        selectionMode && selected && "border-foreground/45 ring-1 ring-foreground/20"
      )}
    >
      <CardContent
        className={cn(
          variant === "compact" ? "space-y-3 !px-5 !py-4" : "space-y-3 pt-0"
        )}
      >
        {showEnglish && (
          <div className="flex items-start gap-2">
            <PlaceholderText
              text={sentence.english}
              sentence={sentence}
              as="p"
              className={cn(
                "min-w-0 flex-1 text-foreground",
                variant === "study"
                  ? "text-lg font-medium leading-relaxed"
                  : variant === "compact"
                    ? "line-clamp-2 text-sm leading-relaxed text-muted"
                    : "text-base leading-relaxed text-muted"
              )}
            />
            {variant === "compact" && !showJapanese && compactPlayFields && (
              <div data-long-press-ignore>
                <SentenceAudioControls
                  sentenceId={sentence.id}
                  japanese={compactPlayFields.japanese}
                  reading={compactPlayFields.reading}
                  phonetic_reading={compactPlayFields.phonetic_reading}
                  register={sentence.register}
                  tags={sentence.tags}
                  context_notes={sentence.context_notes}
                  english={sentence.english}
                  placeholders={compactPlayFields.placeholders ?? sentence.placeholders}
                  fishAudio={sentence.narrationAudio?.fishAudio}
                  dialect={primaryDialect}
                  speaker={sentence.speaker}
                  disabled={!viewHasTranslation}
                  className="mt-0.5"
                />
              </div>
            )}
          </div>
        )}

        {showJapanese && variant === "compact" && (
          <>
            {showKansaiDialect ? (
              <SentenceDialectCompare
                sentence={sentence}
                showRomaji
                japaneseClassName="text-[0.95rem]"
                readingClassName="text-xs"
                phoneticClassName="text-xs"
                romajiClassName="text-xs"
                onTranslate={handleTranslate}
                translatingDialect={translatingDialect}
                onRetranslate={handleRetranslate}
                retranslatingDialect={retranslatingDialect}
                needsRetranslate={(dialect) =>
                  sentenceNeedsRetranslation(sentence.id, dialect)
                }
              />
            ) : viewHasTranslation && viewFields ? (
              <DialectTranslationBlock
                sentenceId={sentence.id}
                fields={viewFields}
                dialect={primaryDialect}
                sentenceMeta={sentence}
                showLabel={false}
                showPlayButton
                showJapanese
                showRomaji={false}
                japaneseClassName="text-[0.95rem]"
                readingClassName="text-xs"
                phoneticClassName="text-xs"
              />
            ) : (
              <Badge variant="secondary">Not yet translated</Badge>
            )}
          </>
        )}

        {showJapanese && variant !== "compact" && translated && sentence.japanese && (
          <PlaceholderText
            text={sentence.japanese}
            sentence={sentence}
            script="japanese"
            as="p"
            className={cn(
              "font-japanese text-foreground",
              variant === "study"
                ? "text-2xl leading-relaxed"
                : "text-xl leading-relaxed"
            )}
          />
        )}
        {showJapanese && variant !== "compact" && !translated && (
          <Badge variant="secondary">Not yet translated</Badge>
        )}
        {showReading && translated && primaryFields && variant !== "compact" && (
          <DialectTranslationBlock
            sentenceId={sentence.id}
            fields={primaryFields}
            dialect={primaryDialect}
            sentenceMeta={sentence}
            showLabel={false}
            showPlayButton={false}
            showJapanese={!showJapanese}
            readingClassName={cn(
              "font-japanese text-muted",
              variant === "study" ? "text-base" : "text-sm"
            )}
            phoneticClassName="text-sm"
            romajiClassName={showRomaji ? "text-sm" : undefined}
          />
        )}
        {translated && sentence.literal_note && variant !== "compact" && (
          <p className="text-xs text-muted">{sentence.literal_note}</p>
        )}
        {variant !== "study" && variant !== "compact" && (
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{sentence.register}</Badge>
            <Badge variant="outline">Lv {sentence.difficulty}</Badge>
            {sentence.subtopic && <Badge variant="outline">{sentence.subtopic}</Badge>}
          </div>
        )}
        {showRetranslate && translated && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            disabled={retranslatingDialect !== null}
            onClick={() => void handleRetranslate()}
          >
            {retranslatingDialect ? "Retranslating…" : "Retranslate"}
          </Button>
        )}
        {onRate && (
          <div
            data-long-press-ignore
            data-sentence-rating
            className={cn(
              variant === "compact" && "mt-1 border-t border-border/40 pt-3"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <StarRating
              value={progress?.rating ?? null}
              onChange={onRate}
              suggested={suggestedRating}
              size={variant === "compact" ? "sm" : "md"}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
