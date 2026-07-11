"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileJson } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { TranslationError, getUntranslatedIds } from "@/lib/services/translation-service";
import {
  ImportError,
  summarizeDataset,
} from "@/lib/services/import-service";
import { getDatasetSynced } from "@/lib/sync/sync-service";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { TranslationProgress } from "@/components/layout/translation-progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ImportPhase = "idle" | "importing" | "translating";

type ImportMeta = { batchCount: number; islandCount: number; fileCount: number };

async function readJsonFiles(
  files: FileList | File[]
): Promise<{ json: unknown; fileName: string }[]> {
  const jsonFiles = Array.from(files).filter(
    (f) => f.name.toLowerCase().endsWith(".json") || f.type === "application/json"
  );

  return Promise.all(
    jsonFiles.map(async (file) => {
      const text = await file.text();
      return { json: JSON.parse(text) as unknown, fileName: file.name };
    })
  );
}

export function ImportScreen() {
  const { importDatasets, translateAllUntranslated } = useApp();
  const router = useRouter();
  const [paste, setPaste] = useState("");
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [translateProgress, setTranslateProgress] = useState({ completed: 0, total: 0 });
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [importMeta, setImportMeta] = useState<ImportMeta | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const finishImport = useCallback(
    (meta: ImportMeta, translatedCount: number) => {
      const filePart = meta.fileCount > 1 ? ` from ${meta.fileCount} files` : "";
      if (translatedCount > 0) {
        toast.success(
          `Imported ${meta.batchCount} batches, ${meta.islandCount} islands${filePart} — translated ${translatedCount} sentences`
        );
      } else {
        toast.success(`Imported ${meta.batchCount} batches, ${meta.islandCount} islands${filePart}`);
      }
      router.push("/");
    },
    [router]
  );

  const runTranslation = useCallback(
    async (meta: ImportMeta) => {
      setTranslateError(null);
      setPhase("translating");

      try {
        const { translatedCount } = await translateAllUntranslated({
          onProgress: (completed, total) => setTranslateProgress({ completed, total }),
        });
        finishImport(meta, translatedCount);
      } catch (e) {
        const message =
          e instanceof TranslationError && e.code === "NOT_CONFIGURED"
            ? "AI is not configured. Add OPENAI_API_KEY to translate imported sentences."
            : e instanceof Error
              ? e.message
              : "Translation failed";
        setTranslateError(message);
        setPhase("translating");
      }
    },
    [translateAllUntranslated, finishImport]
  );

  const handleImportPayloads = useCallback(
    async (payloads: { json: unknown; fileName?: string }[], sourceLabel: string) => {
      if (payloads.length === 0) {
        toast.error("No JSON files to import");
        return;
      }

      setPhase("importing");
      setTranslateError(null);
      setImportStatus(
        payloads.length > 1
          ? `Merging ${payloads.length} files…`
          : `Importing ${sourceLabel}…`
      );

      try {
        await importDatasets(payloads);

        const saved = await getDatasetSynced();
        if (!saved) {
          throw new ImportError("Import failed to save");
        }

        const summary = summarizeDataset(saved);
        const meta: ImportMeta = {
          batchCount: summary.batchCount,
          islandCount: summary.islandCount,
          fileCount: payloads.length,
        };
        const untranslatedTotal = getUntranslatedIds(saved).length;

        setImportMeta(meta);
        setTranslateProgress({ completed: 0, total: untranslatedTotal });

        if (untranslatedTotal === 0) {
          finishImport(meta, 0);
          return;
        }

        await runTranslation(meta);
      } catch (e) {
        setPhase("idle");
        setImportMeta(null);
        setImportStatus(null);
        if (e instanceof ImportError || e instanceof Error) {
          toast.error(e.message);
        } else {
          toast.error("Invalid JSON format");
        }
      }
    },
    [importDatasets, finishImport, runTranslation]
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      try {
        const payloads = await readJsonFiles(files);
        if (payloads.length === 0) {
          toast.error("Choose one or more .json files");
          return;
        }
        await handleImportPayloads(payloads, payloads.map((p) => p.fileName).join(", "));
      } catch {
        toast.error("Could not parse one or more JSON files");
        setPhase("idle");
      }
    },
    [handleImportPayloads]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        void handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const loading = phase !== "idle";

  if (phase === "translating" || phase === "importing") {
    return (
      <PageShell>
        <PageHeader title="Import" subtitle="Load your sentence dataset" backHref="/settings" />
        <TranslationProgress
          completed={translateProgress.completed}
          total={translateProgress.total}
          error={translateError}
          onRetry={() => importMeta && void runTranslation(importMeta)}
          title={phase === "importing" ? "Importing dataset…" : "Translating sentences…"}
          subtitle={
            phase === "importing"
              ? importStatus ?? "Saving your dataset locally."
              : "Untranslated sentences are being prepared for study."
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader title="Import" subtitle="Load your sentence dataset" backHref="/settings" />

      <Card
        className={cn(
          "mb-6 flex flex-col items-center gap-4 border-dashed p-8 text-center transition-colors",
          dragOver && "border-foreground bg-foreground/5"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised">
          <Upload className="h-6 w-6 text-foreground" />
        </div>
        <div>
          <p className="font-medium">Drop JSON files here</p>
          <p className="text-sm text-muted">
            Full datasets or island exports — select multiple at once
          </p>
        </div>
        <Button variant="secondary" asChild disabled={loading}>
          <label className="cursor-pointer">
            Choose files
            <input
              type="file"
              accept=".json,application/json"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files?.length) void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </Button>
      </Card>

      <div className="relative mb-3">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-background px-3 text-muted">or paste JSON</span>
        </div>
      </div>

      <Textarea
        placeholder='{"main_pathway": {...}, "islands": {...}} or a single island object'
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        className="min-h-[160px] text-sm"
      />
      <Button
        className="mt-4 w-full"
        loading={loading}
        onClick={async () => {
          if (!paste.trim()) {
            toast.error("Paste JSON content first");
            return;
          }
          try {
            await handleImportPayloads([{ json: JSON.parse(paste) }], "pasted JSON");
          } catch {
            toast.error("Invalid JSON");
          }
        }}
      >
        <FileJson className="mr-2 h-5 w-5" />
        Import from paste
      </Button>
    </PageShell>
  );
}
