"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { segmentTranscript, AIClientError } from "@/lib/ai/ai-client";
import type { Register, Sentence } from "@/types/sentence";
import { needsTranslation } from "@/lib/sentence-utils";
import { TranslationError } from "@/lib/services/translation-service";
import {
  getGlobalSentenceIds,
  slugifyIslandKey,
} from "@/lib/services/dataset-mutation-service";
import { buildManualIsland } from "@/lib/services/manual-island-service";
import {
  draftsToSentences,
  transcriptSuggestionToDraft,
  type TranscriptSentenceDraft,
} from "@/lib/services/transcript-island-service";
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
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Phase = "loading" | "review" | "translating";

const EMPTY_ADD_DRAFT: TranscriptSentenceDraft = {
  english: "",
  japanese: "",
  reading: "",
  register: "polite",
  context_notes: "",
};

function SentenceEditor({
  draft,
  index,
  onChange,
  onRemove,
}: {
  draft: TranscriptSentenceDraft;
  index: number;
  onChange: (next: TranscriptSentenceDraft) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-border p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted">Sentence {index + 1}</p>
          {draft.reason && (
            <p className="mt-0.5 text-xs text-muted leading-relaxed">{draft.reason}</p>
          )}
        </div>
        <button
          type="button"
          className="shrink-0 rounded p-1 text-muted hover:text-destructive"
          aria-label="Remove sentence"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div>
        <Label className="text-xs text-muted">Japanese</Label>
        <Textarea
          className="mt-1 min-h-[56px] font-japanese"
          value={draft.japanese ?? ""}
          onChange={(e) => onChange({ ...draft, japanese: e.target.value })}
          maxLength={500}
        />
      </div>

      <div>
        <Label className="text-xs text-muted">English meaning</Label>
        <Textarea
          className="mt-1 min-h-[56px]"
          value={draft.english}
          onChange={(e) => onChange({ ...draft, english: e.target.value })}
          maxLength={500}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-muted">Reading (kana)</Label>
          <Input
            className="mt-1 font-japanese"
            value={draft.reading ?? ""}
            onChange={(e) => onChange({ ...draft, reading: e.target.value })}
            maxLength={500}
          />
        </div>
        <div>
          <Label className="text-xs text-muted">Register</Label>
          <Select
            value={draft.register}
            onValueChange={(v) => onChange({ ...draft, register: v as Register })}
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
    </div>
  );
}

export function CreateTranscriptIslandDialog({
  transcript,
  open,
  onOpenChange,
  onCreated,
}: {
  transcript: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (key: string) => void;
}) {
  const { dataset, addIsland, translateSentenceIds } = useApp();

  const [phase, setPhase] = useState<Phase>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [drafts, setDrafts] = useState<TranscriptSentenceDraft[]>([]);
  const [addDraft, setAddDraft] = useState<TranscriptSentenceDraft>(EMPTY_ADD_DRAFT);
  const [saving, setSaving] = useState(false);
  const [translateProgress, setTranslateProgress] = useState({ completed: 0, total: 0 });
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [pendingIslandKey, setPendingIslandKey] = useState("");
  const [pendingTranslateIds, setPendingTranslateIds] = useState<string[]>([]);

  const analyzedTranscriptRef = useRef<string | null>(null);

  const islandKeyPreview = useMemo(() => {
    if (!name.trim() || !dataset) return "";
    return slugifyIslandKey(name, Object.keys(dataset.islands));
  }, [name, dataset]);

  const canAddMore = drafts.length < MAX_ISLAND_SENTENCE_COUNT;
  const addDraftValid = addDraft.english.trim().length > 0;

  const reset = useCallback(() => {
    setPhase("loading");
    setLoadError(null);
    setName("");
    setDescription("");
    setDrafts([]);
    setAddDraft(EMPTY_ADD_DRAFT);
    setSaving(false);
    setTranslateProgress({ completed: 0, total: 0 });
    setTranslateError(null);
    setPendingIslandKey("");
    setPendingTranslateIds([]);
    analyzedTranscriptRef.current = null;
  }, []);

  const runSegmentation = useCallback(async (text: string) => {
    setPhase("loading");
    setLoadError(null);
    try {
      const result = await segmentTranscript(text);
      setName(result.suggestedName);
      setDescription(result.description);
      setDrafts(result.sentences.map(transcriptSuggestionToDraft));
      setPhase("review");
      analyzedTranscriptRef.current = text.trim();
    } catch (e) {
      if (e instanceof AIClientError && e.code === "NOT_CONFIGURED") {
        setLoadError("AI is not configured. Add OPENAI_API_KEY to use transcript segmentation.");
      } else {
        setLoadError(e instanceof Error ? e.message : "Could not analyze transcript");
      }
      setPhase("review");
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const trimmed = transcript.trim();
    if (!trimmed) return;
    if (analyzedTranscriptRef.current === trimmed) return;
    void runSegmentation(trimmed);
  }, [open, transcript, runSegmentation]);

  const handleRetrySegmentation = () => {
    const trimmed = transcript.trim();
    if (!trimmed) return;
    analyzedTranscriptRef.current = null;
    void runSegmentation(trimmed);
  };

  const updateDraft = (index: number, next: TranscriptSentenceDraft) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? next : d)));
  };

  const removeDraft = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddSentence = () => {
    if (!addDraftValid || !canAddMore) return;
    setDrafts((prev) => [
      ...prev,
      {
        ...addDraft,
        english: addDraft.english.trim(),
        japanese: addDraft.japanese?.trim() || undefined,
        reading: addDraft.reading?.trim() || addDraft.japanese?.trim() || undefined,
        context_notes: addDraft.context_notes?.trim() || undefined,
      },
    ]);
    setAddDraft(EMPTY_ADD_DRAFT);
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
      onOpenChange(false);
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
    if (drafts.length < MIN_MANUAL_ISLAND_SENTENCE_COUNT) {
      toast.error("Keep at least one sentence");
      return;
    }

    for (const draft of drafts) {
      if (!draft.english.trim()) {
        toast.error("Every sentence needs an English meaning");
        return;
      }
    }

    setSaving(true);
    try {
      const islandKey = slugifyIslandKey(name, Object.keys(dataset.islands));
      if (dataset.islands[islandKey]) {
        toast.error(`An island named "${islandKey.replace(/_/g, " ")}" already exists`);
        return;
      }

      const globalIds = getGlobalSentenceIds(dataset);
      const sentences: Sentence[] = draftsToSentences(drafts, islandKey, globalIds);
      const island = buildManualIsland(islandKey, name, description, sentences);
      await addIsland(islandKey, island);

      const ids = island.sentences.filter(needsTranslation).map((s) => s.id);
      if (ids.length === 0) {
        toast.success(`Island "${name.trim()}" created`);
        onCreated?.(islandKey);
        onOpenChange(false);
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
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)] p-0 sm:max-w-lg sm:p-0">
        <div className="flex min-h-0 max-h-[min(85vh,720px)] flex-col overflow-hidden px-4 pt-4 sm:px-6 sm:pt-6">
          <DialogHeader className="shrink-0 pr-10 text-left">
            <DialogTitle>Create island from transcript</DialogTitle>
            <DialogDescription>
              AI picks the best study lines — remove, edit, or add more before saving.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4 pt-3 sm:pb-6">
            {phase === "loading" ? (
              <TranslationProgress
                compact
                completed={0}
                total={0}
                title="Analyzing transcript…"
                subtitle="Finding high-value sentences to study"
              />
            ) : phase === "translating" ? (
              <TranslationProgress
                compact
                completed={translateProgress.completed}
                total={translateProgress.total}
                error={translateError}
                onRetry={handleRetryTranslation}
                subtitle="Translating any sentences missing Japanese."
              />
            ) : (
              <div className="space-y-4">
                {loadError && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
                    <p className="text-foreground">{loadError}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                      onClick={handleRetrySegmentation}
                    >
                      Retry analysis
                    </Button>
                  </div>
                )}

                <div>
                  <Label htmlFor="transcript-island-name">Island name</Label>
                  <Input
                    id="transcript-island-name"
                    className="mt-2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                  />
                  {islandKeyPreview && (
                    <p className="mt-1 text-xs text-muted">Key: {islandKeyPreview}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="transcript-island-desc">Description</Label>
                  <Textarea
                    id="transcript-island-desc"
                    className="mt-2 min-h-[72px]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={300}
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Label>Suggested sentences</Label>
                    <Badge variant="outline" className="text-[10px]">
                      {drafts.length} / {MAX_ISLAND_SENTENCE_COUNT}
                    </Badge>
                  </div>

                  {drafts.length === 0 ? (
                    <p className="text-sm text-muted">
                      No sentences yet. Add your own below or retry the analysis.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {drafts.map((draft, index) => (
                        <SentenceEditor
                          key={`${index}-${draft.japanese ?? draft.english}`}
                          draft={draft}
                          index={index}
                          onChange={(next) => updateDraft(index, next)}
                          onRemove={() => removeDraft(index)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {canAddMore && (
                  <div className="space-y-3 rounded-xl border border-dashed border-border p-3">
                    <Label>Add another sentence</Label>
                    <Textarea
                      placeholder="Japanese line (optional if English-only)"
                      className="min-h-[56px] font-japanese"
                      value={addDraft.japanese ?? ""}
                      onChange={(e) =>
                        setAddDraft((d) => ({ ...d, japanese: e.target.value }))
                      }
                      maxLength={500}
                    />
                    <Textarea
                      placeholder="English meaning"
                      className="min-h-[56px]"
                      value={addDraft.english}
                      onChange={(e) =>
                        setAddDraft((d) => ({ ...d, english: e.target.value }))
                      }
                      maxLength={500}
                    />
                    <Button
                      variant="secondary"
                      className="w-full"
                      disabled={!addDraftValid}
                      onClick={handleAddSentence}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add sentence
                    </Button>
                  </div>
                )}

                <Button
                  className={cn("w-full", drafts.length === 0 && "opacity-60")}
                  disabled={
                    drafts.length < MIN_MANUAL_ISLAND_SENTENCE_COUNT ||
                    saving ||
                    !name.trim() ||
                    Boolean(loadError && drafts.length === 0)
                  }
                  loading={saving}
                  onClick={() => void handleCreate()}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Save island ({drafts.length} sentence{drafts.length === 1 ? "" : "s"})
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
