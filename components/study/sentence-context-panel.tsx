"use client";

import type { Sentence } from "@/types/sentence";
import { AskButton } from "@/components/ai/ask-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { isTranslated } from "@/lib/sentence-utils";
import { cn } from "@/lib/utils";

export function SentenceContextPanel({
  sentence,
  className,
}: {
  sentence: Sentence;
  className?: string;
}) {
  const translated = isTranslated(sentence);

  return (
    <aside
      className={cn(
        "hidden md:flex md:w-72 md:shrink-0 md:flex-col md:gap-4 lg:w-80",
        className
      )}
    >
      <Card className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Context</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{sentence.english}</p>
        {translated && sentence.japanese && (
          <p className="mt-3 font-japanese text-lg text-muted">{sentence.japanese}</p>
        )}
        {translated && sentence.reading && (
          <p className="mt-1 font-japanese text-sm text-muted/80">{sentence.reading}</p>
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
