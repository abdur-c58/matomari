"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useSwipeable } from "react-swipeable";
import { useApp } from "@/components/providers/app-provider";
import { AppGate, EmptyState } from "@/components/layout/empty-state";
import { PreparingSentences } from "@/components/layout/preparing-sentences";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { AskButton } from "@/components/ai/ask-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { SentenceCard } from "@/components/sentence/sentence-card";
import { StarRating } from "@/components/sentence/star-rating";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getAllSentences } from "@/lib/validation/dataset-schema";
import { getDueRecallIds } from "@/lib/services/srs-service";
import { getActiveBatchIds, retireSentence, shouldRetire, isMastered } from "@/lib/services/batch-service";
import { recordRecallAttempt, daysSinceFirstSeen } from "@/lib/services/recall-service";
import { suggestRating, applyRating } from "@/lib/services/rating-service";
import { startModeSession, endModeSession, recordMastery } from "@/lib/sync/sync-service";
import { getProgressSynced } from "@/lib/sync/sync-service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useEnsureTranslated } from "@/hooks/use-ensure-translated";
import { ShortcutsHint } from "@/components/layout/shortcuts-hint";
import { useDesktopShortcuts } from "@/hooks/use-desktop-shortcuts";
import { useTutor } from "@/components/ai/tutor-provider";

export function ActiveRecallModeMobile() {
  const { dataset, progress, updateProgress, setProgress } = useApp();
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids");
  const mode = searchParams.get("mode");

  const sentenceIds = useMemo(() => {
    if (idsParam) return idsParam.split(",").filter(Boolean);
    if (!dataset) return [];
    return getDueRecallIds(progress.sentences, getActiveBatchIds(progress));
  }, [idsParam, dataset, progress]);

  const sentences = useMemo(() => {
    if (!dataset) return [];
    const all = getAllSentences(dataset);
    return sentenceIds.map((id) => all.get(id)).filter((s) => !!s);
  }, [dataset, sentenceIds]);

  const { status: translateStatus, error: translateError, retry } =
    useEnsureTranslated(sentenceIds);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [input, setInput] = useState("");
  const [suggestedRating, setSuggestedRating] = useState<number | null>(null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const sessionIdRef = useRef<string | null>(null);

  const current = sentences[index];
  const { closeTutor } = useTutor();

  useEffect(() => {
    startModeSession(mode === "review" ? "review" : "recall").then((id) => {
      sessionIdRef.current = id;
    });
    return () => {
      if (sessionIdRef.current) endModeSession(sessionIdRef.current);
    };
  }, [mode]);

  const advance = useCallback(() => {
    setRevealed(false);
    setInput("");
    setSwipeOffset(0);
    if (index + 1 < sentences.length) {
      setIndex(index + 1);
    } else {
      toast.success("Recall session complete");
    }
  }, [index, sentences.length]);

  const handleMark = useCallback(
    async (correct: boolean) => {
      if (!current) return;

      const sp = progress.sentences[current.id];
      const updated = recordRecallAttempt(
        sp ?? {
          sentenceId: current.id,
          rating: null,
          recallHistory: [],
          meaningConfirmed: false,
          batchStatus: "active",
          srsNextReview: null,
          srsIntervalIndex: 0,
          retiredAt: null,
          firstSeenAt: null,
          masteredAt: null,
          sourceType: "pathway",
          sourceKey: "",
        },
        correct
      );

      const suggested = suggestRating(updated);
      setSuggestedRating(suggested);
      await updateProgress(current.id, updated);

      if (suggested !== null) {
        setShowRatingDialog(true);
      } else {
        advance();
      }
    },
    [current, progress, updateProgress, advance]
  );

  const acceptRating = async (rating: number) => {
    if (!current || !dataset) return;

    await updateProgress(current.id, (sp) => applyRating(sp, rating));

    if (shouldRetire(rating)) {
      const latest = await getProgressSynced();
      await setProgress(retireSentence(dataset, latest, current.id));
    }

    const sp = (await getProgressSynced()).sentences[current.id];
    if (isMastered(rating) && sp) {
      await recordMastery(current.id, daysSinceFirstSeen(sp) ?? 0);
    }

    setShowRatingDialog(false);
    advance();
  };

  const swipeHandlers = useSwipeable({
    onSwiping: (e) => setSwipeOffset(e.deltaX),
    onSwipedLeft: () => revealed && handleMark(false),
    onSwipedRight: () => revealed && handleMark(true),
    onSwiped: () => setSwipeOffset(0),
    trackMouse: false,
  });

  useDesktopShortcuts({
    onArrowLeft: () => {
      if (index > 0) {
        setRevealed(false);
        setInput("");
        setSwipeOffset(0);
        setIndex((i) => i - 1);
      }
    },
    onArrowRight: () => {
      if (index < sentences.length - 1) {
        setRevealed(false);
        setInput("");
        setSwipeOffset(0);
        setIndex((i) => i + 1);
      }
    },
    onReveal: () => {
      if (!revealed) setRevealed(true);
    },
    onEscape: closeTutor,
  });

  if (!current) {
    return (
      <AppGate>
        <PageShell>
          <EmptyState
            title="All caught up"
            description="No sentences due for recall right now."
            actionHref="/"
            actionLabel="Back to Today"
          />
        </PageShell>
      </AppGate>
    );
  }

  if (translateStatus === "loading") {
    return (
      <AppGate>
        <PreparingSentences />
      </AppGate>
    );
  }

  if (translateStatus === "error") {
    return (
      <AppGate>
        <PreparingSentences error={translateError} onRetry={retry} />
      </AppGate>
    );
  }

  const swipeColor =
    swipeOffset > 30 ? "border-success/50" : swipeOffset < -30 ? "border-destructive/50" : "border-border";

  return (
    <AppGate>
      <PageShell>
        <div {...swipeHandlers}>
          <PageHeader
            title="Active Recall"
            subtitle={`${index + 1} / ${sentences.length}`}
            backHref="/"
            action={
              <AskButton
                context={{ type: "sentence", sentenceId: current.id }}
                size="icon"
                variant="ghost"
              />
            }
          />

          <ShortcutsHint
            shortcuts={[
              { keys: "← / →", label: "Previous / next" },
              { keys: "?", label: "Reveal answer" },
              { keys: "Esc", label: "Close tutor" },
            ]}
          />

          <div>
          <motion.div style={{ x: swipeOffset }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
            <Card
              variant="elevated"
              className={cn("mb-6 border-2 transition-colors duration-150", swipeColor)}
            >
              <p className="text-xl font-medium leading-relaxed text-foreground">
                {current.english}
              </p>
            </Card>

            {!revealed ? (
              <div className="space-y-4">
                <Input
                  placeholder="Type Japanese (optional)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <Button className="w-full" size="lg" onClick={() => setRevealed(true)}>
                  Reveal answer
                </Button>
                <Button variant="ghost" className="w-full text-muted" onClick={() => setRevealed(true)}>
                  I said it aloud
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <SentenceCard
                  sentence={current}
                  progress={progress.sentences[current.id]}
                  variant="study"
                  showEnglish={false}
                  showRomaji
                />
                <p className="text-center text-sm text-muted">
                  Swipe right = correct · left = incorrect
                </p>
                <div className="flex gap-3">
                  <Button variant="destructive" className="flex-1" onClick={() => handleMark(false)}>
                    <X className="mr-2 h-5 w-5" /> Incorrect
                  </Button>
                  <Button className="flex-1" onClick={() => handleMark(true)}>
                    <Check className="mr-2 h-5 w-5" /> Correct
                  </Button>
                </div>
              </div>
            )}
          </motion.div>

          <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rate this sentence</DialogTitle>
                <DialogDescription>
                  {suggestedRating
                    ? `Suggested: ${suggestedRating} stars based on your recall`
                    : "How well do you know this sentence?"}
                </DialogDescription>
              </DialogHeader>
              <StarRating
                value={suggestedRating}
                onChange={(r) => acceptRating(r)}
                suggested={suggestedRating}
              />
              <Button variant="ghost" className="w-full" onClick={() => { setShowRatingDialog(false); advance(); }}>
                Skip for now
              </Button>
            </DialogContent>
          </Dialog>
        </div>
        </div>
      </PageShell>
    </AppGate>
  );
}
