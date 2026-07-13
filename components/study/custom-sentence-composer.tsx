"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { AIClientError } from "@/lib/ai/ai-client";
import { createManualSentence } from "@/lib/services/manual-island-service";
import { getGlobalSentenceIds } from "@/lib/services/dataset-mutation-service";
import { getPrimaryTranslation } from "@/lib/preferences/translation-preferences";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Register } from "@/types/sentence";

type ClarifyMessage = { role: "user" | "assistant"; content: string };

export function CustomSentenceComposer({
  islandKey,
  islandTitle,
  variant = "card",
  onSuccess,
}: {
  islandKey: string;
  islandTitle: string;
  variant?: "card" | "dialog";
  onSuccess?: () => void;
}) {
  const { dataset, progress, appendSentenceToIsland, translateSentenceIds } = useApp();
  const [english, setEnglish] = useState("");
  const [clarifyQuestion, setClarifyQuestion] = useState<string | null>(null);
  const [clarifyAnswer, setClarifyAnswer] = useState("");
  const [history, setHistory] = useState<ClarifyMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const resetClarify = () => {
    setClarifyQuestion(null);
    setClarifyAnswer("");
    setHistory([]);
  };

  const checkIntent = useCallback(
    async (text: string, conversationHistory: ClarifyMessage[]) => {
      const res = await fetch("/api/ai/sentence-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          english: text,
          islandName: islandTitle,
          conversationHistory:
            conversationHistory.length > 0 ? conversationHistory : undefined,
        }),
      });

      if (res.status === 503) {
        throw new AIClientError("AI is not configured", "NOT_CONFIGURED");
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new AIClientError(err.error ?? "Request failed", "REQUEST_FAILED");
      }

      return res.json() as Promise<{
        status: "ready" | "clarify";
        question?: string;
        refinedEnglish?: string;
        suggestedRegister?: Register;
        suggestedContextNotes?: string;
      }>;
    },
    [islandTitle]
  );

  const addSentence = useCallback(
    async (finalEnglish: string, register: Register, contextNotes?: string) => {
      if (!dataset) return;

      const globalIds = getGlobalSentenceIds(dataset);
      const island = dataset.islands[islandKey];
      const localIds = new Set(island?.sentences.map((s) => s.id) ?? []);

      const sentence = createManualSentence(
        { english: finalEnglish, register, context_notes: contextNotes },
        islandKey,
        globalIds,
        localIds
      );

      await appendSentenceToIsland(islandKey, sentence);
      const dialect = getPrimaryTranslation(progress.settings);
      await translateSentenceIds([sentence.id], { dialect });
      toast.success("Sentence added and translated");
      setEnglish("");
      resetClarify();
      onSuccess?.();
    },
    [appendSentenceToIsland, dataset, islandKey, onSuccess, progress.settings, translateSentenceIds]
  );

  const handleSubmit = async () => {
    const trimmed = english.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const intent = await checkIntent(trimmed, history);

      if (intent.status === "clarify" && intent.question) {
        setClarifyQuestion(intent.question);
        setHistory((h) => [...h, { role: "user", content: trimmed }]);
        return;
      }

      const finalEnglish = intent.refinedEnglish?.trim() || trimmed;
      await addSentence(
        finalEnglish,
        intent.suggestedRegister ?? "polite",
        intent.suggestedContextNotes
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not analyze sentence");
    } finally {
      setLoading(false);
    }
  };

  const handleClarifySubmit = async () => {
    const answer = clarifyAnswer.trim();
    if (!answer || !clarifyQuestion) return;

    setLoading(true);
    try {
      const nextHistory: ClarifyMessage[] = [
        ...history,
        { role: "assistant", content: clarifyQuestion },
        { role: "user", content: answer },
      ];
      setHistory(nextHistory);

      const combined = `${english.trim()} (${answer})`;
      const intent = await checkIntent(combined, nextHistory);

      if (intent.status === "clarify" && intent.question) {
        setClarifyQuestion(intent.question);
        setClarifyAnswer("");
        return;
      }

      const finalEnglish = intent.refinedEnglish?.trim() || combined;
      await addSentence(
        finalEnglish,
        intent.suggestedRegister ?? "polite",
        intent.suggestedContextNotes
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not analyze sentence");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "space-y-3",
        variant === "card" && "rounded-xl border border-border bg-surface-raised p-4"
      )}
    >
      {variant === "card" && (
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-muted" />
          <Label className="font-medium">Add your own sentence</Label>
        </div>
      )}

      {!clarifyQuestion ? (
        <>
          <Input
            value={english}
            onChange={(e) => setEnglish(e.target.value)}
            placeholder="Type a sentence in English…"
            disabled={loading}
          />
          <Button onClick={handleSubmit} disabled={loading || !english.trim()}>
            {loading ? "Checking…" : "Add sentence"}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-foreground">{clarifyQuestion}</p>
          <Textarea
            value={clarifyAnswer}
            onChange={(e) => setClarifyAnswer(e.target.value)}
            placeholder="Your answer…"
            rows={2}
            disabled={loading}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleClarifySubmit}
              disabled={loading || !clarifyAnswer.trim()}
            >
              Continue
            </Button>
            <Button variant="ghost" onClick={resetClarify} disabled={loading}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export function AddSentenceDialog({
  islandKey,
  islandTitle,
  open,
  onOpenChange,
}: {
  islandKey: string;
  islandTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add sentence</DialogTitle>
          <DialogDescription>
            Add a custom English sentence to {islandTitle}.
          </DialogDescription>
        </DialogHeader>
        <CustomSentenceComposer
          islandKey={islandKey}
          islandTitle={islandTitle}
          variant="dialog"
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
