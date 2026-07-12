"use client";

import type { Sentence } from "@/types/sentence";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { PlaceholderText } from "@/components/sentence/placeholder-text";
import { ListenSentenceDialects } from "@/components/listen/listen-sentence-dialects";

export function SentenceDisplay({
  sentence,
  shadowing = false,
}: {
  sentence: Sentence;
  shadowing?: boolean;
}) {
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
      <ListenSentenceDialects sentence={sentence} variant="shadow" className="mt-3" />
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
