"use client";

import { useEffect, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { audioSession, type TtsRequest } from "@/lib/audio/audio-session";
import { getTtsTextFromFields } from "@/lib/audio/tts-text";
import type { SentencePlaceholder } from "@/types/sentence";
import type { Dialect } from "@/lib/constants/dialect";
import { getPrimaryTranslation } from "@/lib/preferences/translation-preferences";
import { useLearnerJapaneseName } from "@/hooks/use-learner-japanese-name";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type SentenceAudioFields = {
  sentenceId: string;
  japanese?: string | null;
  reading?: string | null;
  phonetic_reading?: string | null;
  register?: string;
  tags?: string[];
  context_notes?: string;
  english?: string;
  placeholders?: SentencePlaceholder[];
  dialect?: Dialect;
  disabled?: boolean;
  className?: string;
};

function buildTtsRequest(
  fields: SentenceAudioFields,
  dialect: Dialect,
  learnerJapaneseName: string | null
): TtsRequest {
  return {
    sentenceId: fields.sentenceId,
    japanese: fields.japanese!,
    reading: fields.reading,
    phonetic_reading: fields.phonetic_reading,
    placeholders: fields.placeholders,
    learnerName: learnerJapaneseName,
    dialect,
    register: fields.register,
    tags: fields.tags,
    context_notes: fields.context_notes,
    english: fields.english,
    ttsSource: "surface",
  };
}

export function SentenceAudioControls({
  sentenceId,
  japanese,
  reading,
  phonetic_reading,
  register,
  tags,
  context_notes,
  english,
  placeholders,
  dialect: dialectProp,
  disabled = false,
  className,
}: SentenceAudioFields) {
  const { audioUnlocked, unlockAudio, audioState, progress } = useApp();
  const learnerJapaneseName = useLearnerJapaneseName();
  const [active, setActive] = useState(false);
  const dialect = dialectProp ?? getPrimaryTranslation(progress.settings);

  const canPlay = Boolean(
    japanese?.trim() &&
      getTtsTextFromFields(japanese, reading, {
        dialect,
        phonetic_reading,
        placeholders,
        learnerName: learnerJapaneseName,
        ttsSource: "surface",
      })
  );

  useEffect(() => {
    if (!active) return;
    if (audioState === "ready" || audioState === "paused" || audioState === "error") {
      setActive(false);
    }
  }, [audioState, active]);

  const loading = active && audioState === "loading";
  const playing = active && audioState === "playing";

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (disabled || !canPlay) {
      toast.error("Audio unavailable for this sentence.");
      return;
    }

    if (!audioUnlocked) {
      await unlockAudio();
      if (!audioSession.isUnlocked()) return;
    }

    audioSession.stopPlaylist();
    setActive(true);

    const request = buildTtsRequest(
      {
        sentenceId,
        japanese,
        reading,
        phonetic_reading,
        register,
        tags,
        context_notes,
        english,
        placeholders,
        dialect,
      },
      dialect,
      learnerJapaneseName
    );

    await audioSession.playSentence(request);
    if (audioSession.getState() === "error") {
      toast.error("Could not play audio");
      setActive(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={disabled || !canPlay || loading}
      aria-label={playing ? "Playing sentence" : "Play sentence"}
      className={cn(
        "size-9 min-h-9 min-w-9 shrink-0 rounded-full p-0 px-0 text-foreground",
        playing && "border-mode-listen text-mode-listen",
        className
      )}
      onClick={handlePlay}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Play className="h-4 w-4 fill-current" strokeWidth={2} />
      )}
    </Button>
  );
}

/** @deprecated Use SentenceAudioControls */
export function SentencePlayButton(props: SentenceAudioFields) {
  return <SentenceAudioControls {...props} />;
}
