"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  CircleX,
  Pause,
  Play,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  marketingTrialSentences,
  type MarketingTrialSentence,
} from "@/lib/constants/marketing-trial";
import { cn } from "@/lib/utils";
import { AudioVisualizer } from "@/components/marketing/trials/audio-visualizer";
import { MarketingAudioGraph } from "@/components/marketing/trials/marketing-audio-graph";

const AUTO_ADVANCE_MS = 1100;

export type DailyLoopTrialActions = {
  onComplete?: () => void;
  onRetryShadow?: () => void;
  onReplay?: () => void;
};

function TrialShell({
  accent,
  children,
  className,
}: {
  accent: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-cursor-interactive
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-[1.25rem] border bg-background/80 p-4 shadow-sm backdrop-blur-sm",
        className
      )}
      style={{
        borderColor: `color-mix(in srgb, ${accent} 45%, var(--border))`,
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

function ScrollCue({
  accent,
  label = "Next step",
}: {
  accent: string;
  label?: string;
}) {
  return (
    <div
      className="marketing-scroll-cue flex items-center gap-2 pt-1"
      style={{ color: accent }}
      role="status"
    >
      <span
        className="marketing-scroll-cue-mouse relative flex h-8 w-5 shrink-0 justify-center rounded-full border"
        style={{
          borderColor: `color-mix(in srgb, ${accent} 70%, var(--border))`,
          boxShadow: `0 0 14px color-mix(in srgb, ${accent} 35%, transparent)`,
        }}
        aria-hidden
      >
        <span
          className="marketing-scroll-cue-dot mt-1.5 h-1.5 w-1.5 rounded-full"
          style={{ background: accent }}
        />
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
        {label}
      </span>
      <ChevronDown
        className="marketing-scroll-cue-chevron h-3.5 w-3.5"
        aria-hidden
      />
    </div>
  );
}

function useAutoAdvance(ready: boolean, onComplete?: () => void) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const firedRef = useRef(false);

  useEffect(() => {
    if (!ready) {
      firedRef.current = false;
      return;
    }
    if (firedRef.current || !onCompleteRef.current) return;
    firedRef.current = true;
    const timer = window.setTimeout(() => onCompleteRef.current?.(), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [ready]);
}

function SentenceBlock({
  sentence,
  emphasize = "both",
}: {
  sentence: MarketingTrialSentence;
  emphasize?: "english" | "japanese" | "both";
}) {
  return (
    <div className="space-y-2">
      {(emphasize === "english" || emphasize === "both") && (
        <p
          className={cn(
            "text-sm leading-relaxed",
            emphasize === "english" ? "text-foreground" : "text-muted"
          )}
        >
          {sentence.english}
        </p>
      )}
      {(emphasize === "japanese" || emphasize === "both") && (
        <>
          <p className="font-japanese text-2xl leading-snug text-foreground">
            {sentence.japanese}
          </p>
          <p className="text-xs text-muted">{sentence.reading}</p>
        </>
      )}
    </div>
  );
}

export function MeaningTrial({
  accent,
  onComplete,
}: {
  accent: string;
  onComplete?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const confirmTimer = useRef<number>(0);
  const current = marketingTrialSentences[index];

  useAutoAdvance(done, onComplete);

  useEffect(
    () => () => window.clearTimeout(confirmTimer.current),
    []
  );

  const onGotIt = () => {
    if (confirming) return;
    setConfirming(true);
    confirmTimer.current = window.setTimeout(() => {
      if (index >= marketingTrialSentences.length - 1) {
        setDone(true);
      } else {
        setIndex((value) => value + 1);
      }
      setConfirming(false);
    }, 480);
  };

  if (done) {
    return (
      <TrialShell accent={accent}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>
          Try it · Confirm meaning
        </p>
        <div className="mt-auto flex flex-1 flex-col items-start justify-center gap-3">
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white"
            style={{ background: accent }}
          >
            <Check className="h-5 w-5" />
          </span>
          <p className="font-display text-xl font-semibold tracking-tight">
            Meaning locked in.
          </p>
          <p className="text-sm text-muted">
            In the app, every sentence in today&apos;s queue is confirmed before shadowing unlocks.
          </p>
          <ScrollCue accent={accent} />
        </div>
      </TrialShell>
    );
  }

  return (
    <TrialShell accent={accent}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>
          Try it · Confirm meaning
        </p>
        <p className="text-[11px] text-muted">
          {index + 1} / {marketingTrialSentences.length}
        </p>
      </div>
      <div
        className="mt-3 h-1 overflow-hidden rounded-full bg-border"
        aria-hidden
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${((index + 1) / marketingTrialSentences.length) * 100}%`,
            background: accent,
          }}
        />
      </div>
      <div
        className={cn(
          "marketing-trial-confirm-card relative mt-4 flex-1 overflow-hidden rounded-xl border border-border/80 bg-surface p-4",
          confirming && "is-confirming"
        )}
      >
        <SentenceBlock sentence={current} emphasize="both" />
        <span
          className="marketing-trial-confirm-check absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-white"
          style={{ background: accent }}
          aria-hidden
        >
          <Check className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-xs text-muted">
        Read it. Listen if it helps. Continue only once the meaning is clear.
      </p>
      <Button
        className="mt-3 w-full"
        size="sm"
        onClick={onGotIt}
        disabled={confirming}
      >
        {confirming ? (
          <>
            <Check className="h-3.5 w-3.5" />
            Confirmed
          </>
        ) : (
          "Got it"
        )}
      </Button>
    </TrialShell>
  );
}

export function ShadowTrial({
  accent,
  onComplete,
}: {
  accent: string;
  onComplete?: () => void;
}) {
  const sentence = marketingTrialSentences[0];
  const [playing, setPlaying] = useState(false);
  const [yourTurn, setYourTurn] = useState(false);
  const [done, setDone] = useState(false);
  const [rate, setRate] = useState(1);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const turnTimer = useRef<number>(0);
  const graphRef = useRef<MarketingAudioGraph | null>(null);

  useAutoAdvance(done, onComplete);

  useEffect(() => {
    const graph = new MarketingAudioGraph();
    graphRef.current = graph;
    return () => {
      window.clearTimeout(turnTimer.current);
      graph.dispose();
      graphRef.current = null;
    };
  }, []);

  const play = async () => {
    window.clearTimeout(turnTimer.current);
    setYourTurn(false);
    setPlaying(true);
    try {
      const graph = graphRef.current;
      if (!graph) return;
      const nextAnalyser = await graph.ensureGraph();
      setAnalyser(nextAnalyser);
      await graph.play(sentence.audioSrc, rate, { title: sentence.japanese });
      setYourTurn(true);
      turnTimer.current = window.setTimeout(() => setYourTurn(false), 3000);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setYourTurn(false);
    } finally {
      setPlaying(false);
    }
  };

  if (done) {
    return (
      <TrialShell accent={accent}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>
          Try it · Listen & shadow
        </p>
        <div className="mt-auto flex flex-1 flex-col items-start justify-center gap-3">
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white"
            style={{ background: accent }}
          >
            <Check className="h-5 w-5" />
          </span>
          <p className="font-display text-xl font-semibold tracking-tight">
            Shadow complete.
          </p>
          <p className="text-sm text-muted">
            In the app you get loop, speed, pause gaps, and sentence-level audio for the whole queue.
          </p>
          <ScrollCue accent={accent} />
        </div>
      </TrialShell>
    );
  }

  return (
    <TrialShell accent={accent}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>
        Try it · Listen & shadow
      </p>
      <div className="mt-4 flex-1 rounded-xl border border-border/80 bg-surface p-4">
        <SentenceBlock sentence={sentence} emphasize="japanese" />
        <p className="mt-3 text-sm text-muted">{sentence.english}</p>
        <div className="mt-4 rounded-lg border border-border/70 bg-background/70 px-3 py-2">
          <AudioVisualizer
            analyser={analyser}
            active={playing}
            accent={accent}
            barCount={48}
            label="Shadowing audio visualizer"
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {[0.5, 0.75, 1, 1.25, 1.5].map((value) => (
          <button
            key={value}
            type="button"
            className={cn(
              "rounded-full border px-2 py-1 text-[10px] transition-[color,background-color,border-color,transform] duration-200 active:scale-90",
              rate === value
                ? "scale-105 border-foreground bg-foreground text-background shadow-sm"
                : "border-border bg-surface text-muted hover:text-foreground"
            )}
            onClick={() => setRate(value)}
          >
            {value}×
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => void play()}
          disabled={playing}
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {playing ? "Playing…" : "Play"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="flex-1"
          onClick={() => setDone(true)}
        >
          Done shadowing
        </Button>
      </div>
      <p
        className={cn(
          "mt-3 min-h-[1.25rem] text-xs font-medium transition-opacity",
          yourTurn ? "opacity-100" : "opacity-0"
        )}
        style={{ color: accent }}
      >
        <Volume2 className="mr-1 inline h-3.5 w-3.5" />
        Your turn — shadow now
      </p>
    </TrialShell>
  );
}

export function RecallTrial({
  accent,
  onComplete,
  onRetryShadow,
}: {
  accent: string;
  onComplete?: () => void;
  onRetryShadow?: () => void;
}) {
  const sentence = marketingTrialSentences[0];
  const [typed, setTyped] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);

  useAutoAdvance(result === "correct", onComplete);

  const reset = () => {
    setTyped("");
    setRevealed(false);
    setResult(null);
  };

  return (
    <TrialShell accent={accent}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>
        Try it · Active recall
      </p>
      <div className="marketing-recall-flip-frame mt-4 flex-1">
        <div
          className={cn(
            "marketing-recall-flip-card",
            revealed && "is-revealed"
          )}
        >
          <div className="marketing-recall-face marketing-recall-front rounded-xl border border-border/80 bg-surface p-4">
            <p className="text-sm text-muted">Say this in Japanese</p>
            <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
              {sentence.english}
            </p>
            <label className="mt-4 block">
              <span className="sr-only">Type Japanese (optional)</span>
              <input
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                placeholder="Type Japanese (optional)"
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-japanese text-sm outline-none ring-offset-background placeholder:text-muted focus-visible:ring-2 focus-visible:ring-foreground/20"
              />
            </label>
          </div>
          <div className="marketing-recall-face marketing-recall-back rounded-xl border border-border/80 bg-surface p-4">
            <p className="mb-3 text-xs font-medium" style={{ color: accent }}>
              Answer
            </p>
            <SentenceBlock sentence={sentence} emphasize="japanese" />
          </div>
        </div>
      </div>
      {!revealed ? (
        <div className="mt-3 flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => setRevealed(true)}>
            Reveal answer
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={() => setRevealed(true)}
          >
            I said it aloud
          </Button>
        </div>
      ) : result === null ? (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={() => setResult("incorrect")}
          >
            Incorrect
          </Button>
          <Button size="sm" className="flex-1" onClick={() => setResult("correct")}>
            Correct
          </Button>
        </div>
      ) : null}
      <div
        className={cn(
          "mt-3 grid overflow-hidden transition-[grid-template-rows,opacity] duration-300",
          result ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0 space-y-3">
          <div
            className={cn(
              "marketing-recall-result flex items-start gap-2 rounded-xl border p-3",
              result === "correct" ? "is-correct" : "is-incorrect"
            )}
          >
            {result === "correct" ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CircleX className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div>
              <p className="text-xs font-semibold">
                {result === "correct"
                  ? "You said it without looking."
                  : "English came first — Japanese didn't."}
              </p>
              <p className="mt-0.5 text-[11px] opacity-80">
                {result === "correct"
                  ? "That's the skill the loop trains: producing the line when you need it."
                  : "Send it back through listen & shadow so the shape sticks in your mouth."}
              </p>
            </div>
            {result === "correct" && (
              <button
                type="button"
                className="ml-auto rounded-md p-1 opacity-70 hover:opacity-100"
                onClick={reset}
                aria-label="Try recall again"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {result === "correct" && <ScrollCue accent={accent} />}
          {result === "incorrect" && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => onRetryShadow?.()}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retry shadow
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => onComplete?.()}
                >
                  Continue anyway
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
              <button
                type="button"
                className="self-start text-[11px] text-muted underline-offset-2 hover:underline"
                onClick={reset}
              >
                Grade again
              </button>
            </div>
          )}
        </div>
      </div>
    </TrialShell>
  );
}

export function RetentionTrial({
  accent,
  onReplay,
}: {
  accent: string;
  onReplay?: () => void;
}) {
  const sentence = marketingTrialSentences[0];
  const [phase, setPhase] = useState<"active" | "scheduled" | "review">(
    "active"
  );
  const [answerVisible, setAnswerVisible] = useState(false);

  const resetLocal = () => {
    setPhase("active");
    setAnswerVisible(false);
  };

  return (
    <TrialShell accent={accent}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>
        Try it · Retention over time
      </p>
      {phase !== "review" ? (
        <>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            A confident sentence leaves today&apos;s queue, then returns at widening intervals.
          </p>
          <div className="marketing-retention-shelves relative mt-4 grid h-20 grid-cols-2 gap-2">
            <div className="rounded-xl border border-dashed border-border bg-surface/60 p-2">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">
                Active queue
              </p>
            </div>
            <div className="rounded-xl border border-dashed border-border bg-surface/60 p-2">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">
                Confident shelf
              </p>
            </div>
            <div
              className={cn(
                "marketing-retention-card absolute bottom-2 left-2 top-7 flex w-[calc(50%_-_0.75rem)] items-center rounded-lg border bg-background px-2.5 shadow-sm",
                phase === "scheduled" && "is-retired"
              )}
              style={{ borderColor: accent }}
            >
              <span className="font-japanese text-sm">{sentence.japanese}</span>
              {phase === "scheduled" && (
                <Check className="ml-auto h-3.5 w-3.5" style={{ color: accent }} />
              )}
            </div>
          </div>
          <div className="mt-4">
            <div className="relative flex items-center justify-between">
              <span className="absolute left-3 right-3 top-2 h-px bg-border" />
              {[1, 3, 7, 14].map((day, index) => (
                <div key={day} className="relative z-[1] flex flex-col items-center gap-1">
                  <span
                    className={cn(
                      "marketing-review-node h-4 w-4 rounded-full border-2 bg-surface",
                      phase === "scheduled" && "is-scheduled"
                    )}
                    style={{
                      color: accent,
                      borderColor:
                        phase === "scheduled" ? accent : "var(--border)",
                      animationDelay: `${index * 90}ms`,
                    }}
                  />
                  <span className="text-[9px] text-muted">Day {day}</span>
                </div>
              ))}
            </div>
          </div>
          {phase === "active" ? (
            <Button
              size="sm"
              className="mt-auto w-full"
              onClick={() => setPhase("scheduled")}
            >
              <Check className="h-3.5 w-3.5" />
              Mark confident
            </Button>
          ) : (
            <Button
              size="sm"
              className="mt-auto w-full"
              onClick={() => setPhase("review")}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Jump to the future review
            </Button>
          )}
        </>
      ) : (
        <div className="mt-4 flex flex-1 flex-col">
          <div className="rounded-xl border border-border/80 bg-surface p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
              Due today · Day 7
            </p>
            <p className="mt-3 text-sm text-muted">Can you still say it?</p>
            <p className="mt-1 font-display text-xl font-semibold">
              {sentence.english}
            </p>
            <div
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300",
                answerVisible
                  ? "mt-4 grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <p className="font-japanese text-xl">{sentence.japanese}</p>
                <p className="mt-1 text-xs text-muted">{sentence.reading}</p>
              </div>
            </div>
          </div>
          {!answerVisible ? (
            <Button
              size="sm"
              className="mt-3 w-full"
              onClick={() => setAnswerVisible(true)}
            >
              Check retention
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <div className="mt-3 rounded-xl border border-border bg-background p-3">
              <p className="text-xs font-semibold" style={{ color: accent }}>
                Still available after a week.
              </p>
              <p className="mt-1 text-[11px] text-muted">
                A correct review widens the next interval instead of returning the sentence to daily practice.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => onReplay?.()}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Replay all steps
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full"
                  onClick={resetLocal}
                >
                  Replay this step
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </TrialShell>
  );
}

export function DailyLoopTrial({
  stepId,
  accent,
  onComplete,
  onRetryShadow,
  onReplay,
}: {
  stepId: string;
  accent: string;
} & DailyLoopTrialActions) {
  if (stepId === "meaning") {
    return <MeaningTrial accent={accent} onComplete={onComplete} />;
  }
  if (stepId === "shadow") {
    return <ShadowTrial accent={accent} onComplete={onComplete} />;
  }
  if (stepId === "recall") {
    return (
      <RecallTrial
        accent={accent}
        onComplete={onComplete}
        onRetryShadow={onRetryShadow}
      />
    );
  }
  return <RetentionTrial accent={accent} onReplay={onReplay} />;
}
