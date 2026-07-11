"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { generateIsland, fetchIslandSuggestions, AIClientError } from "@/lib/ai/ai-client";
import type { IslandGenerationPreview, IslandSuggestion } from "@/lib/ai/types";
import { needsTranslation } from "@/lib/sentence-utils";
import { TranslationError } from "@/lib/services/translation-service";
import {
  DEFAULT_ISLAND_SENTENCE_COUNT,
  MAX_ISLAND_SENTENCE_COUNT,
  MIN_ISLAND_SENTENCE_COUNT,
} from "@/lib/constants/study";
import { TranslationProgress } from "@/components/layout/translation-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Phase = "form" | "preview" | "translating";

const FALLBACK_SUGGESTIONS: IslandSuggestion[] = [
  { theme: "izakaya ordering", reason: "Essential casual dining phrases for nights out." },
  { theme: "train travel", reason: "Navigate stations, tickets, and delays confidently." },
  { theme: "convenience store", reason: "Quick transactions and requests you'll use daily." },
  { theme: "doctor visit", reason: "Describe symptoms and understand basic medical talk." },
  { theme: "apartment hunting", reason: "Viewings, rent questions, and moving-in logistics." },
  { theme: "making friends", reason: "Small talk and invitations beyond textbook politeness." },
];

export function CreateIslandDialog({ onCreated }: { onCreated?: (key: string) => void }) {
  const { dataset, addIsland, translateSentenceIds } = useApp();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [theme, setTheme] = useState("");
  const [sentenceCount, setSentenceCount] = useState(DEFAULT_ISLAND_SENTENCE_COUNT);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<IslandGenerationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [translateProgress, setTranslateProgress] = useState({ completed: 0, total: 0 });
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [pendingTranslateIds, setPendingTranslateIds] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<IslandSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const reset = () => {
    setPhase("form");
    setTheme("");
    setSentenceCount(DEFAULT_ISLAND_SENTENCE_COUNT);
    setPreview(null);
    setError(null);
    setLoading(false);
    setTranslateProgress({ completed: 0, total: 0 });
    setTranslateError(null);
    setPendingTranslateIds([]);
    setSuggestions([]);
  };

  const loadSuggestions = useCallback(async () => {
    if (!dataset) return;
    setSuggestionsLoading(true);
    try {
      const result = await fetchIslandSuggestions(dataset);
      setSuggestions(result);
    } catch (e) {
      if (e instanceof AIClientError && e.code === "NOT_CONFIGURED") {
        setSuggestions(FALLBACK_SUGGESTIONS);
      } else {
        setSuggestions(FALLBACK_SUGGESTIONS);
      }
    } finally {
      setSuggestionsLoading(false);
    }
  }, [dataset]);

  useEffect(() => {
    if (open && dataset && phase === "form" && !preview) {
      void loadSuggestions();
    }
  }, [open, dataset, phase, preview, loadSuggestions]);

  const handleGenerate = async () => {
    if (!dataset || !theme.trim()) return;
    setLoading(true);
    setError(null);
    setPreview(null);
    setPhase("form");

    try {
      const result = await generateIsland(theme.trim(), dataset, {
        sentenceCount,
        difficultyRange: [1, 3],
      });
      setPreview(result);
      setPhase("preview");
    } catch (e) {
      if (e instanceof AIClientError && e.code === "NOT_CONFIGURED") {
        setError("AI is not configured. Add OPENAI_API_KEY to your environment.");
      } else {
        setError(e instanceof Error ? e.message : "Generation failed");
      }
    } finally {
      setLoading(false);
    }
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

  const handleSave = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      await addIsland(preview.islandKey, {
        description: preview.description,
        subtopics: preview.subtopics,
        sentences: preview.sentences,
      });

      const ids = preview.sentences.filter(needsTranslation).map((s) => s.id);
      if (ids.length === 0) {
        toast.success(`Island "${preview.islandKey.replace(/_/g, " ")}" created`);
        onCreated?.(preview.islandKey);
        setOpen(false);
        reset();
        return;
      }

      setPendingTranslateIds(ids);
      await runTranslation(ids, preview.islandKey);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save island");
    } finally {
      setLoading(false);
    }
  };

  const handleRetryTranslation = () => {
    if (!preview || pendingTranslateIds.length === 0) return;
    void runTranslation(pendingTranslateIds, preview.islandKey);
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
        <Button variant="secondary" className="w-full">
          <Sparkles className="mr-2 h-4 w-4" />
          Create island with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create island with AI</DialogTitle>
          <DialogDescription>
            Describe a theme and AI will generate sentences, reusing existing ones when appropriate.
          </DialogDescription>
        </DialogHeader>

        {phase === "translating" ? (
          <TranslationProgress
            compact
            completed={translateProgress.completed}
            total={translateProgress.total}
            error={translateError}
            onRetry={handleRetryTranslation}
            subtitle="New sentences are being translated before you study them."
          />
        ) : !preview ? (
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Suggested themes</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => void loadSuggestions()}
                  disabled={suggestionsLoading || !dataset}
                >
                  <RefreshCw
                    className={cn("mr-1 h-3.5 w-3.5", suggestionsLoading && "animate-spin")}
                  />
                  Refresh
                </Button>
              </div>
              {suggestionsLoading ? (
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-16 w-[calc(50%-0.25rem)] rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {suggestions.map((s) => (
                    <button
                      key={s.theme}
                      type="button"
                      onClick={() => setTheme(s.theme)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-colors",
                        theme === s.theme
                          ? "border-foreground bg-foreground/5"
                          : "border-border hover:border-foreground/30"
                      )}
                    >
                      <p className="text-sm font-medium text-foreground">{s.theme}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted">{s.reason}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="island-theme">Theme</Label>
              <Input
                id="island-theme"
                className="mt-2"
                placeholder="e.g. izakaya ordering, train travel"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              />
            </div>
            <div>
              <Label>Sentence count: {sentenceCount}</Label>
              <Slider
                className="mt-3"
                min={MIN_ISLAND_SENTENCE_COUNT}
                max={MAX_ISLAND_SENTENCE_COUNT}
                step={1}
                value={[sentenceCount]}
                onValueChange={([v]) => setSentenceCount(v)}
              />
              <p className="mt-1 text-xs text-muted">Islands can have up to {MAX_ISLAND_SENTENCE_COUNT} sentences.</p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={!theme.trim() || loading || !dataset}
              loading={loading}
            >
              {loading ? "Generating…" : "Generate preview"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="font-medium">{preview.islandKey.replace(/_/g, " ")}</p>
              <p className="text-sm text-muted">{preview.description}</p>
              <div className="mt-2 flex gap-2">
                <Badge variant="secondary">{preview.sentences.length} sentences</Badge>
                <Badge variant="success">{preview.reusedIds.length} reused</Badge>
                <Badge variant="warning">{preview.newCount} new</Badge>
              </div>
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
              {preview.sentences.map((s) => (
                <div key={s.id} className="text-sm">
                  <span>{s.english}</span>
                  {preview.reusedIds.includes(s.id) ? (
                    <Badge variant="outline" className="ml-2 text-xs">
                      reused
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      new
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setPreview(null);
                  setPhase("form");
                }}
                disabled={loading}
              >
                Back
              </Button>
              <Button className="flex-1" onClick={handleSave} loading={loading}>
                Save island
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
