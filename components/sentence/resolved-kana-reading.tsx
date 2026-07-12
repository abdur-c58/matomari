"use client";

import type { Sentence } from "@/types/sentence";
import { resolveKanaReadingForDisplay } from "@/lib/sentence/placeholders";
import { useLearnerJapaneseName } from "@/hooks/use-learner-japanese-name";
import { cn } from "@/lib/utils";

type ResolvedKanaReadingProps = {
  reading: string;
  sentence?: Pick<Sentence, "placeholders">;
  className?: string;
  as?: "p" | "span";
};

export function ResolvedKanaReading({
  reading,
  sentence,
  className,
  as: Component = "p",
}: ResolvedKanaReadingProps) {
  const learnerJapaneseName = useLearnerJapaneseName();
  const display =
    resolveKanaReadingForDisplay(reading, sentence?.placeholders, learnerJapaneseName) ??
    reading;

  return <Component className={cn(className)}>{display}</Component>;
}
