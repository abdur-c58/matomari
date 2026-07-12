"use client";

import type { Sentence } from "@/types/sentence";
import { useApp } from "@/components/providers/app-provider";
import { getPrimaryTranslation } from "@/lib/preferences/translation-preferences";
import { PlaceholderText } from "@/components/sentence/placeholder-text";
import {
  parsePlaceholderTags,
  resolveKanaReadingForDisplay,
  resolveLatinReadingSubstitutes,
} from "@/lib/sentence/placeholders";
import { shouldShowKansaiPhonetic } from "@/lib/sentence/kansai-phonetic";
import { useLearnerJapaneseName } from "@/hooks/use-learner-japanese-name";
import { useLearnerName } from "@/hooks/use-learner-name";
import { cn } from "@/lib/utils";

type KansaiPhoneticDisplayProps = {
  sentence: Pick<
    Sentence,
    "reading" | "phonetic_reading" | "romaji" | "placeholders" | "english"
  >;
  className?: string;
  kanaClassName?: string;
  romajiClassName?: string;
};

export function KansaiPhoneticDisplay({
  sentence,
  className,
  kanaClassName,
  romajiClassName,
}: KansaiPhoneticDisplayProps) {
  const { progress } = useApp();
  const dialect = getPrimaryTranslation(progress.settings);
  const learnerJapaneseName = useLearnerJapaneseName();
  const learnerName = useLearnerName();

  if (!shouldShowKansaiPhonetic(dialect, sentence.reading, sentence.phonetic_reading)) {
    return null;
  }

  const phonetic =
    resolveKanaReadingForDisplay(
      sentence.phonetic_reading,
      sentence.placeholders,
      learnerJapaneseName
    ) ?? sentence.phonetic_reading!.trim();

  const romajiRaw = sentence.romaji?.trim();
  const romajiHasTags =
    romajiRaw != null &&
    parsePlaceholderTags(romajiRaw).some((segment) => segment.type === "tag");
  const resolvedRomaji =
    romajiRaw && !romajiHasTags
      ? resolveLatinReadingSubstitutes(romajiRaw, sentence.placeholders, learnerName)
      : romajiRaw;

  return (
    <div className={cn("space-y-0.5", className)} role="note" aria-label="Kansai pronunciation">
      <p className={cn("font-japanese italic leading-relaxed text-muted", kanaClassName)}>
        {phonetic}
      </p>
      {romajiRaw &&
        (romajiHasTags ? (
          <PlaceholderText
            text={romajiRaw}
            sentence={sentence}
            as="p"
            className={cn("italic leading-relaxed text-muted", romajiClassName ?? "text-sm")}
          />
        ) : (
          <p className={cn("italic leading-relaxed text-muted", romajiClassName ?? "text-sm")}>
            {resolvedRomaji}
          </p>
        ))}
    </div>
  );
}
