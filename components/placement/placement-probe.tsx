"use client";

import { useState } from "react";
import type { Sentence } from "@/types/sentence";
import type { ProbeRating } from "@/lib/constants/pathway-placement";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const RATING_OPTIONS: { value: ProbeRating; label: string; hint: string }[] = [
  {
    value: "confident",
    label: "Got it",
    hint: "I could produce this from the English alone",
  },
  {
    value: "shaky",
    label: "Shaky",
    hint: "I might struggle or need a moment",
  },
  {
    value: "new",
    label: "New to me",
    hint: "I wouldn't know how to say this",
  },
];

export function PlacementProbe({
  sentences,
  onComplete,
  onBack,
}: {
  sentences: Sentence[];
  onComplete: (ratings: ProbeRating[]) => void;
  onBack: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [ratings, setRatings] = useState<ProbeRating[]>([]);
  const [showJapanese, setShowJapanese] = useState(false);

  const current = sentences[index];
  const total = sentences.length;

  if (!current) {
    return null;
  }

  const handleRate = (rating: ProbeRating) => {
    const next = [...ratings, rating];
    setRatings(next);
    setShowJapanese(false);
    if (index + 1 >= total) {
      onComplete(next);
    } else {
      setIndex(index + 1);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <Badge variant="secondary">
            Quick check {index + 1} / {total}
          </Badge>
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back
          </Button>
        </div>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Could you say this in Japanese?
        </h1>
        <p className="mt-2 text-sm text-muted">
          Read the English. Imagine the recall prompt — no need to type anything.
        </p>
      </div>

      <Card className="p-5">
        <p className="text-lg font-medium text-foreground">{current.english}</p>
        {showJapanese && current.japanese && (
          <p className="mt-3 font-japanese text-base text-muted">{current.japanese}</p>
        )}
        {!showJapanese && (current.japanese || current.reading) && (
          <Button
            variant="ghost"
            className="mt-2 h-auto p-0 text-sm text-muted underline-offset-4 hover:underline"
            onClick={() => setShowJapanese(true)}
          >
            Show Japanese
          </Button>
        )}
      </Card>

      <div className="space-y-2">
        {RATING_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleRate(opt.value)}
            className="w-full text-left"
          >
            <Card className="p-4 transition-colors hover:border-foreground/30">
              <p className="font-medium text-foreground">{opt.label}</p>
              <p className="mt-0.5 text-sm text-muted">{opt.hint}</p>
            </Card>
          </button>
        ))}
      </div>

      <div className="flex gap-1">
        {sentences.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              "h-1 flex-1 rounded-full",
              i < ratings.length ? "bg-foreground" : i === index ? "bg-foreground/40" : "bg-border"
            )}
          />
        ))}
      </div>
    </div>
  );
}
