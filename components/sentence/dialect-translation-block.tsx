"use client";

import type { Dialect } from "@/lib/constants/dialect";
import { getDialectLabel } from "@/lib/constants/dialect";
import type { Sentence, TranslatedFields } from "@/types/sentence";
import { PlaceholderText } from "@/components/sentence/placeholder-text";
import { ResolvedKanaReading } from "@/components/sentence/resolved-kana-reading";
import { SentenceAudioControls } from "@/components/audio/sentence-play-button";
import { shouldShowKansaiPhonetic } from "@/lib/sentence/kansai-phonetic";
import {
  parsePlaceholderTags,
  resolveKanaReadingForDisplay,
  resolveLatinReadingSubstitutes,
} from "@/lib/sentence/placeholders";
import { useLearnerJapaneseName } from "@/hooks/use-learner-japanese-name";
import { useLearnerName } from "@/hooks/use-learner-name";
import { cn } from "@/lib/utils";

type DialectTranslationBlockProps = {
  sentenceId: string;
  fields: TranslatedFields;
  dialect: Dialect;
  sentenceMeta: Pick<
    Sentence,
    "register" | "tags" | "context_notes" | "english" | "placeholders"
  >;
  showLabel?: boolean;
  showPlayButton?: boolean;
  showJapanese?: boolean;
  showReading?: boolean;
  /** Set to false to suppress the romaji transliteration line (default: true). */
  showRomaji?: boolean;
  className?: string;
  japaneseClassName?: string;
  readingClassName?: string;
  phoneticClassName?: string;
  romajiClassName?: string;
};

export function DialectTranslationBlock({
  sentenceId,
  fields,
  dialect,
  sentenceMeta,
  showLabel = true,
  showPlayButton = true,
  showJapanese = true,
  showReading = true,
  showRomaji = true,
  className,
  japaneseClassName,
  readingClassName,
  phoneticClassName,
  romajiClassName,
}: DialectTranslationBlockProps) {
  const learnerJapaneseName = useLearnerJapaneseName();
  const learnerName = useLearnerName();

  const placeholderSentence = {
    placeholders: fields.placeholders ?? sentenceMeta.placeholders,
  };

  const showPhonetic = shouldShowKansaiPhonetic(dialect, fields.reading, fields.phonetic_reading);

  const romajiRaw = fields.romaji?.trim();
  const romajiHasTags =
    romajiRaw != null &&
    parsePlaceholderTags(romajiRaw).some((segment) => segment.type === "tag");
  const resolvedRomaji =
    romajiRaw && !romajiHasTags
      ? resolveLatinReadingSubstitutes(
          romajiRaw,
          placeholderSentence.placeholders,
          learnerName
        )
      : romajiRaw;

  const resolvedPhonetic =
    resolveKanaReadingForDisplay(
      fields.phonetic_reading,
      placeholderSentence.placeholders,
      learnerJapaneseName
    ) ?? fields.phonetic_reading;

  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && (
        <p className="text-xs font-medium text-muted">{getDialectLabel(dialect)}</p>
      )}

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          {showJapanese && (
            <PlaceholderText
              text={fields.japanese}
              sentence={placeholderSentence}
              script="japanese"
              as="p"
              className={cn("font-japanese leading-relaxed text-foreground", japaneseClassName)}
            />
          )}

          {showReading && fields.reading && (
            <ResolvedKanaReading
              reading={fields.reading}
              sentence={placeholderSentence}
              className={cn("font-japanese text-muted", readingClassName ?? "text-xs")}
            />
          )}

          {showPhonetic && fields.phonetic_reading && (
            <>
              <p
                className={cn(
                  "font-japanese italic leading-relaxed text-muted",
                  phoneticClassName ?? "text-xs"
                )}
              >
                {resolvedPhonetic}
              </p>
              {showRomaji && romajiRaw &&
                (romajiHasTags ? (
                  <PlaceholderText
                    text={romajiRaw}
                    sentence={placeholderSentence}
                    as="p"
                    className={cn(
                      "italic leading-relaxed text-muted",
                      romajiClassName ?? "text-xs"
                    )}
                  />
                ) : (
                  <p
                    className={cn(
                      "italic leading-relaxed text-muted",
                      romajiClassName ?? "text-xs"
                    )}
                  >
                    {resolvedRomaji}
                  </p>
                ))}
            </>
          )}
        </div>

        {showPlayButton && (
          <SentenceAudioControls
            sentenceId={sentenceId}
            japanese={fields.japanese}
            reading={fields.reading}
            phonetic_reading={fields.phonetic_reading}
            register={sentenceMeta.register}
            tags={sentenceMeta.tags}
            context_notes={sentenceMeta.context_notes}
            english={sentenceMeta.english}
            placeholders={placeholderSentence.placeholders}
            dialect={dialect}
            className="mt-0.5"
          />
        )}
      </div>
    </div>
  );
}
