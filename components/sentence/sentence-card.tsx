"use client";

import { useState } from "react";
import type { Sentence } from "@/types/sentence";
import type { SentenceProgress } from "@/types/progress";
import { useApp } from "@/components/providers/app-provider";
import { isTranslated } from "@/lib/sentence-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "./star-rating";
import { PlaceholderText } from "./placeholder-text";
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
}: SentenceCardProps) {
  const { retranslateSentence } = useApp();
  const [retranslating, setRetranslating] = useState(false);
  const mastered = progress?.rating === 5;
  const translated = isTranslated(sentence);

  const handleRetranslate = async () => {
    setRetranslating(true);
    try {
      await retranslateSentence(sentence.id);
      toast.success("Translation updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Retranslation failed");
    } finally {
      setRetranslating(false);
    }
  };

  return (
    <Card
      mastered={mastered}
      variant={variant === "study" ? "elevated" : "default"}
      className={cn(variant === "compact" && "p-4")}
    >
      <CardContent className={cn("space-y-3", "pt-0")}>
        {showEnglish && (
          <PlaceholderText
            text={sentence.english}
            sentence={sentence}
            as="p"
            className={cn(
              "leading-relaxed text-foreground",
              variant === "study" ? "text-lg font-medium" : "text-base text-muted"
            )}
          />
        )}
        {showJapanese && translated && sentence.japanese && (
          <PlaceholderText
            text={sentence.japanese}
            sentence={sentence}
            script="japanese"
            as="p"
            className={cn(
              "font-japanese leading-relaxed text-foreground",
              variant === "study" ? "text-2xl" : variant === "compact" ? "text-lg" : "text-xl"
            )}
          />
        )}
        {showJapanese && !translated && (
          <Badge variant="secondary">Not yet translated</Badge>
        )}
        {showReading && translated && sentence.reading && (
          <p className="font-japanese text-base text-muted">{sentence.reading}</p>
        )}
        {showRomaji && translated && sentence.romaji && (
          <PlaceholderText
            text={sentence.romaji}
            sentence={sentence}
            className="text-sm text-muted italic"
          />
        )}
        {translated && sentence.literal_note && (
          <p className="text-xs text-muted">{sentence.literal_note}</p>
        )}
        {variant !== "study" && (
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
            disabled={retranslating}
            onClick={handleRetranslate}
          >
            {retranslating ? "Retranslating…" : "Retranslate"}
          </Button>
        )}
        {onRate && (
          <StarRating
            value={progress?.rating ?? null}
            onChange={onRate}
            suggested={suggestedRating}
            size={variant === "compact" ? "sm" : "md"}
          />
        )}
      </CardContent>
    </Card>
  );
}
