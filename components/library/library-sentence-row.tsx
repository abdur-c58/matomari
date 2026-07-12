"use client";

import { useState } from "react";
import type { Sentence } from "@/types/sentence";
import type { SentenceProgress } from "@/types/progress";
import { useApp } from "@/components/providers/app-provider";
import { isTranslated } from "@/lib/sentence-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/sentence/star-rating";
import { AskButton } from "@/components/ai/ask-button";
import { SentencePlayButton } from "@/components/audio/sentence-play-button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getDialectLabel } from "@/lib/constants/dialect";
import { MotionCollapse } from "@/components/motion/motion-collapse";
import { ChevronDown, Star, Check } from "lucide-react";

function RatingPill({ rating }: { rating: number | null }) {
  if (rating === null) {
    return <span className="text-xs tabular-nums text-muted">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium tabular-nums text-foreground">
      <Star className="h-3 w-3 fill-warning text-warning" />
      {rating}
    </span>
  );
}

export function LibrarySentenceRow({
  sentence,
  progress,
  isActive,
  suggestedRating,
  onRate,
  selectionMode = false,
  selectable = false,
  selected = false,
  onToggleSelect,
}: {
  sentence: Sentence;
  progress?: SentenceProgress | null;
  isActive: boolean;
  suggestedRating: number | null;
  onRate: (rating: number) => void;
  selectionMode?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const { retranslateSentence, sentenceNeedsRetranslation, progress: userProgress } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [retranslating, setRetranslating] = useState(false);
  const translated = isTranslated(sentence);
  const showRetranslate = sentenceNeedsRetranslation(sentence.id);
  const dialectLabel = getDialectLabel(userProgress.settings.dialect);
  const rating = progress?.rating ?? null;

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

  const handleRowClick = () => {
    if (selectionMode && selectable && onToggleSelect) {
      onToggleSelect();
      return;
    }
    setExpanded((v) => !v);
  };

  return (
    <div
      className={cn(
        "border-b border-border/60 last:border-b-0",
        isActive && "bg-foreground/[0.03]",
        selectionMode && selected && "bg-mode-meaning/5"
      )}
    >
      <div className="flex w-full items-start gap-1 px-1 py-2.5">
        {selectionMode && selectable && (
          <button
            type="button"
            className={cn(
              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border touch-manipulation",
              selected
                ? "border-mode-meaning bg-mode-meaning text-white"
                : "border-border bg-surface text-transparent"
            )}
            onClick={onToggleSelect}
            aria-label={selected ? "Deselect sentence" : "Select sentence"}
            aria-pressed={selected}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
        )}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-2 text-left touch-manipulation"
          onClick={handleRowClick}
          aria-expanded={expanded}
        >
          <div className="flex w-8 shrink-0 flex-col items-center pt-0.5">
            <RatingPill rating={rating} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm leading-snug text-foreground">{sentence.english}</p>
            <p
              className={cn(
                "truncate text-sm leading-snug",
                translated ? "font-japanese text-muted" : "text-xs italic text-muted"
              )}
            >
              {translated && sentence.japanese ? sentence.japanese : "Not yet translated"}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {isActive && (
                <Badge variant="default" className="h-5 px-1.5 text-[10px]">
                  active
                </Badge>
              )}
              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                {sentence.register}
              </Badge>
              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                Lv{sentence.difficulty}
              </Badge>
              {progress?.meaningConfirmed && (
                <Badge variant="success" className="h-5 px-1.5 text-[10px]">
                  ✓
                </Badge>
              )}
            </div>
          </div>
        </button>
        <SentencePlayButton
          sentenceId={sentence.id}
          japanese={sentence.japanese}
          reading={sentence.reading}
          phonetic_reading={sentence.phonetic_reading}
          register={sentence.register}
          tags={sentence.tags}
          context_notes={sentence.context_notes}
          english={sentence.english}
          disabled={!translated}
          className="mt-0.5"
        />
        <button
          type="button"
          className="mt-0.5 shrink-0 rounded-lg p-1 text-muted touch-manipulation hover:text-foreground"
          onClick={() => {
            if (selectionMode && selectable && onToggleSelect) {
              onToggleSelect();
              return;
            }
            setExpanded((v) => !v);
          }}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse sentence" : "Expand sentence"}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200 ease-out",
              expanded && "rotate-180"
            )}
          />
        </button>
      </div>

      <MotionCollapse open={expanded && !selectionMode} className="border-t border-border/40">
        <div className="space-y-2 px-1 pb-3 pt-2 pl-10">
          {translated && sentence.reading && (
            <p className="font-japanese text-xs text-muted">{sentence.reading}</p>
          )}
          {sentence.context_notes && (
            <p className="text-xs text-muted">{sentence.context_notes}</p>
          )}
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-[10px]">
              {sentence.subtopic.replace(/_/g, " ")}
            </Badge>
            {sentence.tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="outline" className="text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StarRating
              value={rating}
              onChange={onRate}
              suggested={suggestedRating}
              size="sm"
            />
            <div className="flex gap-1">
              {showRetranslate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={retranslating}
                  onClick={handleRetranslate}
                >
                  Re-translate ({dialectLabel})
                </Button>
              )}
              <AskButton
                context={{ type: "sentence", sentenceId: sentence.id }}
                label="Ask"
                variant="ghost"
                size="sm"
              />
            </div>
          </div>
        </div>
      </MotionCollapse>
    </div>
  );
}
