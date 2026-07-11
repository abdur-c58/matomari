import type { Dataset } from "@/types/sentence";
import type { UserProgress } from "@/types/progress";
import { buildDatasetSummary } from "./context-builder";
import { buildFullSentenceCatalog } from "@/lib/services/dataset-mutation-service";
import type { ChatMessage, IslandGenerationPreview, IslandSuggestion, TutorContext } from "./types";

export class AIClientError extends Error {
  constructor(
    message: string,
    public code: "NOT_CONFIGURED" | "REQUEST_FAILED"
  ) {
    super(message);
    this.name = "AIClientError";
  }
}

export async function* streamChat(
  messages: ChatMessage[],
  context: TutorContext,
  dataset: Dataset,
  progress?: UserProgress
): AsyncGenerator<string> {
  const datasetSummary = buildDatasetSummary(dataset, context, progress);

  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, context, datasetSummary }),
  });

  if (res.status === 503) {
    throw new AIClientError("AI is not configured", "NOT_CONFIGURED");
  }
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new AIClientError(err.error ?? "Request failed", "REQUEST_FAILED");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) yield chunk;
  }
}

export async function generateIsland(
  theme: string,
  dataset: Dataset,
  options?: {
    sentenceCount?: number;
    difficultyRange?: [number, number];
  }
): Promise<IslandGenerationPreview> {
  const res = await fetch("/api/ai/island", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      theme,
      sentenceCount: options?.sentenceCount ?? 20,
      difficultyRange: options?.difficultyRange ?? [1, 3],
      sentenceCatalog: buildFullSentenceCatalog(dataset),
      existingIslandKeys: Object.keys(dataset.islands),
    }),
  });

  if (res.status === 503) {
    throw new AIClientError("AI is not configured", "NOT_CONFIGURED");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new AIClientError(err.error ?? "Request failed", "REQUEST_FAILED");
  }

  return res.json();
}

export async function fetchIslandSuggestions(
  dataset: Dataset
): Promise<IslandSuggestion[]> {
  const pathwayBatchTitles = dataset.main_pathway.batches.map((b) => b.batch_title);
  const pathwaySubtopics = dataset.main_pathway.batches.flatMap((b) =>
    b.sentences.map((s) => s.subtopic)
  );

  const res = await fetch("/api/ai/island-suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      existingIslandKeys: Object.keys(dataset.islands),
      pathwayBatchTitles,
      pathwaySubtopics,
    }),
  });

  if (res.status === 503) {
    throw new AIClientError("AI is not configured", "NOT_CONFIGURED");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new AIClientError(err.error ?? "Request failed", "REQUEST_FAILED");
  }

  const data = (await res.json()) as { suggestions: IslandSuggestion[] };
  return data.suggestions;
}

export { buildSentenceCatalog } from "./context-builder";
