"use client";

import type { Sentence } from "@/types/sentence";
import { useApp } from "@/components/providers/app-provider";
import { PlaceholderText } from "@/components/sentence/placeholder-text";
import { shouldShowKansaiPhonetic } from "@/lib/sentence/kansai-phonetic";
import { cn } from "@/lib/utils";

type KansaiPhoneticDisplayProps = {
  sentence: Pick<
    Sentence,
    "reading" | "phonetic_reading" | "romaji" | "placeholders" | "english"
  >;
  className?: string;
  labelClassName?: string;
  kanaClassName?: string;
  romajiClassName?: string;
};

export function KansaiPhoneticDisplay({
  sentence,
  className,
  labelClassName,
  kanaClassName,
  romajiClassName,
}: KansaiPhoneticDisplayProps) {
  const { progress } = useApp();
  const dialect = progress.settings.dialect;

  if (!shouldShowKansaiPhonetic(dialect, sentence.reading, sentence.phonetic_reading)) {
    return null;
  }

  const phonetic = sentence.phonetic_reading!.trim();

  return (
    <div className={cn("space-y-0.5", className)} role="note" aria-label="Kansai pronunciation">
      <p className={cn("text-xs font-medium text-muted", labelClassName)}>
        Pronounced in Kansai dialect
      </p>
      <p className={cn("font-japanese italic leading-relaxed text-muted", kanaClassName)}>
        {phonetic}
      </p>
      {sentence.romaji?.trim() && (
        <PlaceholderText
          text={sentence.romaji}
          sentence={sentence}
          as="p"
          className={cn("italic leading-relaxed text-muted", romajiClassName ?? "text-sm")}
        />
      )}
    </div>
  );
}
