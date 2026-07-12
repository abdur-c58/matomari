"use client";

import type { Sentence } from "@/types/sentence";
import { motion } from "framer-motion";
import { useApp } from "@/components/providers/app-provider";
import { fieldsFromComposedSentence } from "@/lib/sentence-utils";
import { getPrimaryTranslation } from "@/lib/preferences/translation-preferences";
import { Card } from "@/components/ui/card";
import { PlaceholderText } from "@/components/sentence/placeholder-text";
import { DialectTranslationBlock } from "@/components/sentence/dialect-translation-block";

export function SentenceDisplay({
  sentence,
  shadowing = false,
}: {
  sentence: Sentence;
  shadowing?: boolean;
}) {
  const { progress } = useApp();
  const primaryDialect = getPrimaryTranslation(progress.settings);
  const primaryFields = fieldsFromComposedSentence(sentence);

  return (
    <Card variant="elevated" className="text-center">
      <PlaceholderText
        text={sentence.english}
        sentence={sentence}
        as="p"
        className="text-base text-muted"
      />
      <PlaceholderText
        text={sentence.japanese ?? ""}
        sentence={sentence}
        script="japanese"
        as="p"
        className="mt-4 font-japanese text-3xl leading-relaxed text-foreground"
      />
      {primaryFields && (
        <DialectTranslationBlock
          sentenceId={sentence.id}
          fields={primaryFields}
          dialect={primaryDialect}
          sentenceMeta={sentence}
          showLabel={false}
          showPlayButton={false}
          showJapanese={false}
          className="mt-3"
          readingClassName="font-japanese text-lg text-muted"
          phoneticClassName="text-lg"
          romajiClassName="text-base"
        />
      )}
      {shadowing && (
        <motion.div
          className="mt-6 flex flex-col items-center gap-2"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-mode-listen/30">
            <div className="h-6 w-6 rounded-full bg-mode-listen/20" />
          </div>
          <p className="text-sm font-semibold text-mode-listen">Shadow now</p>
        </motion.div>
      )}
    </Card>
  );
}
