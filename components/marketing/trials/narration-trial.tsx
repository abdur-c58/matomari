"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play, RotateCcw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  marketingNarrationBatch,
  type MarketingNarrationSentence,
} from "@/lib/constants/marketing-narration";
import { cn } from "@/lib/utils";
import { AudioVisualizer } from "@/components/marketing/trials/audio-visualizer";
import { MarketingAudioGraph } from "@/components/marketing/trials/marketing-audio-graph";

function wait(ms: number, signal: { cancelled: boolean }) {
  return new Promise<void>((resolve) => {
    // Use timers, not rAF — background tabs throttle/pause animation frames,
    // which would stall conversation gaps while the user multitasks.
    if (ms <= 0 || signal.cancelled) {
      resolve();
      return;
    }

    const timer = window.setTimeout(() => {
      window.clearInterval(cancelPoll);
      resolve();
    }, ms);

    const cancelPoll = window.setInterval(() => {
      if (!signal.cancelled) return;
      window.clearTimeout(timer);
      window.clearInterval(cancelPoll);
      resolve();
    }, 50);
  });
}

function SpeakerChip({
  speaker,
  active,
}: {
  speaker: "A" | "B";
  active?: boolean;
}) {
  const isA = speaker === "A";
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tracking-wide",
        active ? "text-background" : "text-foreground"
      )}
      style={{
        background: active
          ? isA
            ? "var(--mode-listen)"
            : "var(--mode-meaning)"
          : "color-mix(in srgb, var(--foreground) 10%, var(--surface))",
      }}
    >
      {speaker}
    </span>
  );
}

function DialogueLine({
  sentence,
  active,
  onPlay,
}: {
  sentence: MarketingNarrationSentence;
  active: boolean;
  onPlay: () => void;
}) {
  const isA = sentence.speaker === "A";

  return (
    <button
      type="button"
      data-cursor-interactive
      onClick={onPlay}
      className={cn(
        "marketing-narration-line group flex w-full min-w-0 gap-3 rounded-2xl border p-3 text-left transition-[border-color,background-color,box-shadow,transform] duration-300",
        isA ? "flex-row" : "flex-row-reverse",
        active && "is-active"
      )}
      style={{
        borderColor: active
          ? `color-mix(in srgb, ${isA ? "var(--mode-listen)" : "var(--mode-meaning)"} 55%, var(--border))`
          : "var(--border)",
        background: active
          ? `color-mix(in srgb, ${isA ? "var(--mode-listen)" : "var(--mode-meaning)"} 10%, var(--surface))`
          : "color-mix(in srgb, var(--surface) 88%, var(--background))",
        boxShadow: active
          ? `0 0 22px color-mix(in srgb, ${isA ? "var(--mode-listen)" : "var(--mode-meaning)"} 28%, transparent)`
          : "none",
      }}
    >
      <SpeakerChip speaker={sentence.speaker} active={active} />
      <div className={cn("min-w-0 flex-1", !isA && "text-right")}>
        <p className="font-japanese text-lg leading-snug text-foreground sm:text-xl">
          {sentence.japanese}
        </p>
        <p className="mt-1 text-xs text-muted">{sentence.english}</p>
      </div>
    </button>
  );
}

export function NarrationTrial({ accent }: { accent: string }) {
  const sentences = marketingNarrationBatch.sentences;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playingAll, setPlayingAll] = useState(false);
  const [done, setDone] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const graphRef = useRef<MarketingAudioGraph | null>(null);
  const cancelRef = useRef({ cancelled: false });

  useEffect(() => {
    const graph = new MarketingAudioGraph();
    graphRef.current = graph;
    return () => {
      cancelRef.current.cancelled = true;
      graph.dispose();
      graphRef.current = null;
    };
  }, []);

  const stopPlayback = () => {
    cancelRef.current.cancelled = true;
    graphRef.current?.stop();
    setPlaying(false);
    setPlayingAll(false);
    setActiveIndex(null);
  };

  const playSource = async (src: string, title?: string) => {
    const graph = graphRef.current;
    if (!graph) return;
    const nextAnalyser = await graph.ensureGraph();
    setAnalyser(nextAnalyser);
    setPlaying(true);
    try {
      await graph.play(src, 1, { title });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      throw error;
    } finally {
      setPlaying(false);
    }
  };

  const playOne = async (index: number) => {
    stopPlayback();
    const signal = { cancelled: false };
    cancelRef.current = signal;
    const sentence = sentences[index];
    setActiveIndex(index);
    try {
      await playSource(sentence.audioSrc, sentence.japanese);
    } catch {
      // Keep silent on demo playback failure; user can retry.
    } finally {
      if (!signal.cancelled) setActiveIndex(null);
    }
  };

  const playConversation = async () => {
    stopPlayback();
    const signal = { cancelled: false };
    cancelRef.current = signal;
    setDone(false);
    setPlayingAll(true);

    try {
      for (let index = 0; index < sentences.length; index += 1) {
        if (signal.cancelled) return;
        const sentence = sentences[index];
        setActiveIndex(index);
        await playSource(sentence.audioSrc, sentence.japanese);
        if (signal.cancelled) return;
        await wait(sentence.narrationAudio.pauseAfterMs, signal);
      }
      if (!signal.cancelled) setDone(true);
    } catch {
      // Ignore interrupted/failed demo playback.
    } finally {
      if (!signal.cancelled) {
        setPlayingAll(false);
        setActiveIndex(null);
      }
    }
  };

  const visualizerAccent =
    activeIndex === null
      ? accent
      : sentences[activeIndex]?.speaker === "B"
        ? "var(--mode-meaning)"
        : "var(--mode-listen)";

  return (
    <div
      data-cursor-interactive
      className="relative flex h-full min-w-0 flex-col overflow-visible rounded-[1.5rem] border bg-background/80 p-4 shadow-sm backdrop-blur-sm sm:p-5"
      style={{
        borderColor: `color-mix(in srgb, ${accent} 45%, var(--border))`,
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: accent }}
          >
            Try it · Narration
          </p>
          <p className="mt-1 font-display text-lg font-semibold tracking-tight">
            {marketingNarrationBatch.title}
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted"
          style={{
            borderColor: `color-mix(in srgb, ${accent} 40%, var(--border))`,
          }}
        >
          <Users className="h-3 w-3" />
          Speakers A / B
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted">
        {marketingNarrationBatch.narrationMode.context}
      </p>

      <div className="mt-3 py-1">
        <AudioVisualizer
          analyser={analyser}
          active={playing}
          accent={visualizerAccent}
          barCount={52}
          label="Narration audio visualizer"
        />
      </div>

      <div className="mt-1 flex min-h-0 flex-1 flex-col gap-2.5 overflow-visible p-3">
        {sentences.map((sentence, index) => (
          <DialogueLine
            key={sentence.id}
            sentence={sentence}
            active={activeIndex === index}
            onPlay={() => void playOne(index)}
          />
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => {
            if (playingAll) stopPlayback();
            else void playConversation();
          }}
        >
          {playingAll ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          {playingAll ? "Stop" : "Play conversation"}
        </Button>
        {done && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setDone(false);
              void playConversation();
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Replay
          </Button>
        )}
      </div>

      {done && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <p className="text-muted">
            Now make one for a conversation you actually want to have.
          </p>
          <Link
            href="/today"
            className="font-semibold text-foreground underline decoration-foreground/35 underline-offset-4 transition-colors hover:decoration-foreground"
          >
            Get started →
          </Link>
        </div>
      )}
    </div>
  );
}
