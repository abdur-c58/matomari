"use client";

import { useEffect, useState } from "react";
import type { Sentence } from "@/types/sentence";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AudioControls } from "@/components/audio/audio-controls";
import { ResponsivePageShell } from "@/components/layout/responsive-page-shell";
import { ResponsivePageHeader } from "@/components/layout/responsive-page-header";
import { MOBILE_MEDIA_QUERY, useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { AskButton } from "@/components/ai/ask-button";
import { Card } from "@/components/ui/card";
import { PlaceholderText } from "@/components/sentence/placeholder-text";
import { KansaiPhoneticDisplay } from "@/components/sentence/kansai-phonetic-display";
import { SentenceContextPanel } from "@/components/study/sentence-context-panel";
import { useDesktopShortcuts } from "@/hooks/use-desktop-shortcuts";
import { useTutor } from "@/components/ai/tutor-provider";
import { audioSession } from "@/lib/audio/audio-session";
import { cn } from "@/lib/utils";

export function MeaningCheck({
  sentences,
  onConfirm,
  onComplete,
}: {
  sentences: Sentence[];
  onConfirm: (id: string) => Promise<void>;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const { closeTutor } = useTutor();
  const current = sentences[index];
  const progress = ((index + 1) / sentences.length) * 100;

  useEffect(() => {
    if (sentences.length === 0) onComplete();
  }, [sentences.length, onComplete]);

  useEffect(() => {
    audioSession.stopPlaylist();
  }, [current?.id]);

  if (!current) return null;

  const handleGotIt = async () => {
    await onConfirm(current.id);
    if (index + 1 >= sentences.length) {
      onComplete();
    } else {
      setIndex(index + 1);
    }
  };

  const isMobile = useIsMobileViewport(MOBILE_MEDIA_QUERY);

  useDesktopShortcuts({
    onEscape: closeTutor,
  });

  return (
    <ResponsivePageShell>
      <ResponsivePageHeader
        title="Confirm meaning"
        subtitle={`Step 1 · ${index + 1} of ${sentences.length}`}
        backHref="/"
        action={
          <AskButton
            context={{ type: "sentence", sentenceId: current.id }}
            size="icon"
            variant="ghost"
          />
        }
      />

      <div className={cn(!isMobile && "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-8")}>
        <div>
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-border-subtle">
        <motion.div
          className="h-full bg-foreground rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <Card variant="elevated" className="mb-6">
        <PlaceholderText
          text={current.english}
          sentence={current}
          as="p"
          className="text-lg font-medium leading-relaxed text-foreground"
        />
        <PlaceholderText
          text={current.japanese ?? ""}
          sentence={current}
          script="japanese"
          as="p"
          className="mt-4 font-japanese text-xl text-muted"
        />
        {current.reading && (
          <p className="mt-2 font-japanese text-base text-muted/80">{current.reading}</p>
        )}
        <KansaiPhoneticDisplay sentence={current} className="mt-2" />
      </Card>

      <div className="mb-4">
        <AudioControls
          sentenceId={current.id}
          japanese={current.japanese}
          reading={current.reading}
          phonetic_reading={current.phonetic_reading}
          placeholders={current.placeholders}
          register={current.register}
          tags={current.tags}
          context_notes={current.context_notes}
          english={current.english}
        />
      </div>

      <p className="mb-4 text-center text-sm text-muted">
        Read each sentence and listen once if helpful. Only continue once you understand the meaning.
      </p>

      <Button className={cn(isMobile ? "w-full" : "w-auto")} size="lg" onClick={handleGotIt}>
        Got it
      </Button>
        </div>
        {!isMobile && <SentenceContextPanel sentence={current} />}
      </div>
    </ResponsivePageShell>
  );
}
