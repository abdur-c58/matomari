"use client";

import { useCallback, useMemo, useState } from "react";
import { PenLine, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { reviewSentence, AIClientError } from "@/lib/ai/ai-client";
import type { SentenceReviewResult } from "@/lib/ai/types";
import type { Register, Sentence } from "@/types/sentence";
import { needsTranslation } from "@/lib/sentence-utils";
import { TranslationError } from "@/lib/services/translation-service";
import {
  getGlobalSentenceIds,
  slugifyIslandKey,
} from "@/lib/services/dataset-mutation-service";
import {
  buildManualIsland,
  createManualSentence,
  type ManualSentenceDraft,
} from "@/lib/services/manual-island-service";
import {
  MAX_ISLAND_SENTENCE_COUNT,
  MIN_MANUAL_ISLAND_SENTENCE_COUNT,
} from "@/lib/constants/study";
import { TranslationProgress } from "@/components/layout/translation-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fetchIslandThemeKanji } from "@/lib/services/study-unit-kanji-service";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Phase = "setup" | "sentences" | "translating";

const EMPTY_DRAFT: ManualSentenceDraft = {
  english: "",
  register: "polite",
  context_notes: "",
};

function SentenceReviewPanel({
  review,
  onApply,
  onDismiss,
}: {
  review: SentenceReviewResult;
  onApply: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">AI review</p>
        {review.hasIssues ? (
          <Badge variant="warning" className="text-[10px]">
            suggestions
          </Badge>
        ) : (
          <Badge variant="success" className="text-[10px]">
            looks good
          </Badge>
        )}
      </div>

      {review.correctedEnglish && (
        <div>
          <p className="text-xs text-muted">Suggested wording</p>
          <p className="mt-1 text-sm text-foreground">{review.correctedEnglish}</p>
        </div>
      )}

      {review.grammarNotes.length > 0 && (
        <ul className="list-disc space-y-1 pl-4 text-xs text-muted">
          {review.grammarNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}

      {review.toneQuestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted">Clarify tone</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-foreground">
            {review.toneQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {review.suggestedContextNotes && (
        <p className="text-xs text-muted">
          Context note: {review.suggestedContextNotes}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="h-8" onClick={onApply}>
          Apply & add sentence
        </Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}

export function CreateManualIslandDialog({
  onCreated,
  compact = false,
}: {
  onCreated?: (key: string) => void;
  compact?: boolean;
}) {
  const { dataset, addIsland, translateSentenceIds } = useApp();

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("setup");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [draft, setDraft] = useState<ManualSentenceDraft>(EMPTY_DRAFT);
  const [review, setReview] = useState<SentenceReviewResult | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [translateProgress, setTranslateProgress] = useState({ completed: 0, total: 0 });
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [pendingIslandKey, setPendingIslandKey] = useState("");
  const [pendingTranslateIds, setPendingTranslateIds] = useState<string[]>([]);

  const islandKeyPreview = useMemo(() => {
    if (!name.trim() || !dataset) return "";
    return slugifyIslandKey(name, Object.keys(dataset.islands));
  }, [name, dataset]);

  const canAddMore = sentences.length < MAX_ISLAND_SENTENCE_COUNT;
  const draftValid = draft.english.trim().length > 0;

  const reset = () => {
    setPhase("setup");
    setName("");
    setDescription("");
    setSentences([]);
    setDraft(EMPTY_DRAFT);
    setReview(null);
    setReviewing(false);
    setSaving(false);
    setTranslateProgress({ completed: 0, total: 0 });
    setTranslateError(null);
    setPendingIslandKey("");
    setPendingTranslateIds([]);
  };

  const resetDraft = () => {
    setDraft(EMPTY_DRAFT);
    setReview(null);
  };

  const addSentenceFromDraft = useCallback(
    (override?: Partial<ManualSentenceDraft>) => {
      if (!dataset || !islandKeyPreview) return;

      const merged: ManualSentenceDraft = {
        english: override?.english ?? draft.english,
        register: override?.register ?? draft.register,
        context_notes: override?.context_notes ?? draft.context_notes,
      };

      try {
        const globalIds = getGlobalSentenceIds(dataset);
        const localIds = new Set(sentences.map((s) => s.id));
        const sentence = createManualSentence(merged, islandKeyPreview, globalIds, localIds);
        setSentences((prev) => [...prev, sentence]);
        resetDraft();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not add sentence");
      }
    },
    [dataset, draft, islandKeyPreview, sentences]
  );

  const handleReview = async () => {
    if (!draftValid) return;

    setReviewing(true);
    setReview(null);
    try {
      const result = await reviewSentence({
        english: draft.english,
        register: draft.register,
        contextNotes: draft.context_notes,
        islandName: name.trim() || undefined,
      });
      setReview(result);
    } catch (e) {
      if (e instanceof AIClientError && e.code === "NOT_CONFIGURED") {
        toast.error("AI is not configured. Add OPENAI_API_KEY or add the sentence directly.");
      } else {
        toast.error(e instanceof Error ? e.message : "Review failed");
      }
    } finally {
      setReviewing(false);
    }
  };

  const handleApplyReview = () => {
    if (!review) return;
    addSentenceFromDraft({
      english: review.correctedEnglish,
      register: review.suggestedRegister,
      context_notes: review.suggestedContextNotes ?? draft.context_notes,
    });
  };

  const handleAddDirect = () => {
    if (!draftValid) return;
    addSentenceFromDraft();
  };

  const runTranslation = async (ids: string[], islandKey: string) => {
    setTranslateError(null);
    setTranslateProgress({ completed: 0, total: ids.length });
    setPhase("translating");

    try {
      const { translatedCount } = await translateSentenceIds(ids, {
        onProgress: (completed, total) => setTranslateProgress({ completed, total }),
      });
      const label = islandKey.replace(/_/g, " ");
      toast.success(
        translatedCount > 0
          ? `Island "${label}" created and translated`
          : `Island "${label}" created`
      );
      onCreated?.(islandKey);
      setOpen(false);
      reset();
    } catch (e) {
      const message =
        e instanceof TranslationError && e.code === "NOT_CONFIGURED"
          ? "AI is not configured. Add OPENAI_API_KEY to translate sentences."
          : e instanceof Error
            ? e.message
            : "Translation failed";
      setTranslateError(message);
    }
  };

  const handleCreate = async () => {
    if (!dataset || !name.trim()) return;
    if (sentences.length < MIN_MANUAL_ISLAND_SENTENCE_COUNT) {
      toast.error("Add at least one sentence");
      return;
    }

    setSaving(true);
    try {
      const islandKey = slugifyIslandKey(name, Object.keys(dataset.islands));
      if (dataset.islands[islandKey]) {
        toast.error(`An island named "${islandKey.replace(/_/g, " ")}" already exists`);
        return;
      }

      const island = buildManualIsland(islandKey, name, description, sentences);
      const themeKanji = await fetchIslandThemeKanji({
        title: name.trim(),
        description: description.trim() || island.description,
        subtopics: island.subtopics,
      });

      await addIsland(islandKey, {
        ...island,
        ...(themeKanji ? { themeKanji } : {}),
      });

      const ids = island.sentences.filter(needsTranslation).map((s) => s.id);
      if (ids.length === 0) {
        toast.success(`Island "${name.trim()}" created`);
        onCreated?.(islandKey);
        setOpen(false);
        reset();
        return;
      }

      setPendingIslandKey(islandKey);
      setPendingTranslateIds(ids);
      await runTranslation(ids, islandKey);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create island");
    } finally {
      setSaving(false);
    }
  };

  const handleRetryTranslation = () => {
    if (!pendingIslandKey || pendingTranslateIds.length === 0) return;
    void runTranslation(pendingTranslateIds, pendingIslandKey);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && phase === "translating") return;
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "shrink-0 rounded-full border-border/70",
            !compact && "mt-2 w-full"
          )}
        >
          <PenLine className="mr-1.5 h-3.5 w-3.5" />
          {compact ? "Manual" : "Create island manually"}
        </Button>
      </DialogTrigger>
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)] p-0 sm:p-0">
        <div className="flex min-h-0 max-h-full flex-col overflow-hidden px-4 pt-4 sm:px-6 sm:pt-6">
          <DialogHeader className="shrink-0 pr-10 text-left">
            <DialogTitle>Create island manually</DialogTitle>
            <DialogDescription>
              Name your island and add English sentences. Review each line with AI for grammar and
              tone, or add directly.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4 pt-3 sm:pb-6">
        {phase === "translating" ? (
          <TranslationProgress
            compact
            completed={translateProgress.completed}
            total={translateProgress.total}
            error={translateError}
            onRetry={handleRetryTranslation}
            subtitle="Sentences are being translated before you study them."
          />
        ) : phase === "setup" ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="manual-island-name">Island name</Label>
              <Input
                id="manual-island-name"
                className="mt-2"
                placeholder="e.g. Coffee shop small talk"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
              {islandKeyPreview && (
                <p className="mt-1 text-xs text-muted">Key: {islandKeyPreview}</p>
              )}
            </div>
            <div>
              <Label htmlFor="manual-island-desc">Description (optional)</Label>
              <Textarea
                id="manual-island-desc"
                className="mt-2 min-h-[72px]"
                placeholder="What situation or topic is this island for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
              />
            </div>
            <Button
              className="w-full"
              disabled={!name.trim()}
              onClick={() => setPhase("sentences")}
            >
              Next — add sentences
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{name.trim()}</p>
                <p className="text-xs text-muted">
                  {sentences.length} / {MAX_ISLAND_SENTENCE_COUNT} sentences
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => setPhase("setup")}
              >
                Edit name
              </Button>
            </div>

            {sentences.length > 0 && (
              <div className="max-h-28 space-y-2 overflow-y-auto rounded-xl border border-border p-3 sm:max-h-36">
                {sentences.map((s, index) => (
                  <div
                    key={s.id}
                    className="flex items-start justify-between gap-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-muted">{index + 1}.</span>{" "}
                      <span>{s.english}</span>
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        {s.register}
                      </Badge>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded p-1 text-muted hover:text-destructive"
                      aria-label="Remove sentence"
                      onClick={() =>
                        setSentences((prev) => prev.filter((item) => item.id !== s.id))
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {canAddMore && (
              <div className="space-y-3 rounded-xl border border-dashed border-border p-3">
                <Label>New sentence</Label>
                <Textarea
                  placeholder="English sentence to translate later…"
                  value={draft.english}
                  onChange={(e) => {
                    setDraft((d) => ({ ...d, english: e.target.value }));
                    setReview(null);
                  }}
                  className="min-h-[80px]"
                  maxLength={500}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted">Register</Label>
                    <Select
                      value={draft.register}
                      onValueChange={(v) =>
                        setDraft((d) => ({ ...d, register: v as Register }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="polite">Polite</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted">Context (optional)</Label>
                  <Input
                    className="mt-1"
                    placeholder="e.g. said to a barista"
                    value={draft.context_notes ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, context_notes: e.target.value }))
                    }
                    maxLength={200}
                  />
                </div>

                {review && (
                  <SentenceReviewPanel
                    review={review}
                    onApply={handleApplyReview}
                    onDismiss={() => setReview(null)}
                  />
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    disabled={!draftValid || reviewing}
                    loading={reviewing}
                    onClick={() => void handleReview()}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    Review with AI
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!draftValid || reviewing}
                    onClick={handleAddDirect}
                  >
                    Add without review
                  </Button>
                </div>
              </div>
            )}

            {!canAddMore && (
              <p className="text-sm text-muted">
                Maximum of {MAX_ISLAND_SENTENCE_COUNT} sentences reached.
              </p>
            )}

            <Button
              className={cn("w-full", sentences.length === 0 && "opacity-60")}
              disabled={sentences.length < MIN_MANUAL_ISLAND_SENTENCE_COUNT || saving}
              loading={saving}
              onClick={() => void handleCreate()}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Create island ({sentences.length} sentence{sentences.length === 1 ? "" : "s"})
            </Button>
          </div>
        )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
