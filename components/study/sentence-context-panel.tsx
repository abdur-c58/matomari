"use client";

import type { Sentence } from "@/types/sentence";
import { useApp } from "@/components/providers/app-provider";
import { AskButton } from "@/components/ai/ask-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PlaceholderText } from "@/components/sentence/placeholder-text";
import { DialectTranslationBlock } from "@/components/sentence/dialect-translation-block";
import { fieldsFromComposedSentence, isTranslated } from "@/lib/sentence-utils";
import { getPrimaryTranslation } from "@/lib/preferences/translation-preferences";
import { cn } from "@/lib/utils";

export function SentenceContextPanel({
  sentence,
  className,
}: {
  sentence: Sentence;
  className?: string;
}) {
  const { progress } = useApp();
  const translated = isTranslated(sentence);
  const primaryDialect = getPrimaryTranslation(progress.settings);
  const primaryFields = fieldsFromComposedSentence(sentence);

  return (
    <aside
      className={cn(
        "flex w-72 shrink-0 flex-col gap-4 lg:w-80",
        className
      )}
    >
      <Card className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Context</p>
        <PlaceholderText
          text={sentence.english}
          sentence={sentence}
          as="p"
          className="mt-2 text-sm leading-relaxed text-foreground"
        />
        {translated && sentence.japanese && (
          <PlaceholderText
            text={sentence.japanese}
            sentence={sentence}
            script="japanese"
            as="p"
            className="mt-3 font-japanese text-lg text-muted"
          />
        )}
        {translated && primaryFields && (
          <DialectTranslationBlock
            sentenceId={sentence.id}
            fields={primaryFields}
            dialect={primaryDialect}
            sentenceMeta={sentence}
            showLabel={false}
            showPlayButton={false}
            showJapanese={false}
            className="mt-2"
            readingClassName="font-japanese text-sm text-muted/80"
            phoneticClassName="text-sm"
            romajiClassName="text-xs"
          />
        )}
        {sentence.context_notes && (
          <p className="mt-3 text-sm text-muted">{sentence.context_notes}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Badge variant="outline">{sentence.register}</Badge>
          <Badge variant="outline">Lv{sentence.difficulty}</Badge>
          <Badge variant="secondary">{sentence.subtopic.replace(/_/g, " ")}</Badge>
          {sentence.tags.slice(0, 4).map((t) => (
            <Badge key={t} variant="outline" className="text-xs">
              {t}
            </Badge>
          ))}
        </div>
        <div className="mt-4">
          <AskButton
            context={{ type: "sentence", sentenceId: sentence.id }}
            label="Ask about this"
            variant="secondary"
            size="sm"
          />
        </div>
      </Card>
    </aside>
  );
}
