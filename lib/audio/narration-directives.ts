import {
  clampNarrationPauseMs,
  parseFishAudioDirectives,
  type NarrationAudioDirectives,
} from "@/lib/audio/fish-audio-cues";
import type { Scene, NarrationAudio, Sentence } from "@/types/sentence";

export type NarrationDirectiveTurnKey = {
  sceneKey: string;
  sentenceId: string;
  /** 0-based occurrence among duplicate sentence IDs in the scene order. */
  occurrence: number;
};

export type NarrationDirectiveRecord = NarrationDirectiveTurnKey &
  NarrationAudioDirectives;

export type NarrationDirectivesSidecar = {
  version: 1;
  updatedAt: string;
  turns: NarrationDirectiveRecord[];
};

export function narrationDirectiveKey(turn: NarrationDirectiveTurnKey): string {
  return `${turn.sceneKey}::${turn.sentenceId}::${turn.occurrence}`;
}

export function normalizeNarrationDirectiveRecord(
  raw: unknown
): NarrationDirectiveRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (
    typeof obj.sceneKey !== "string" ||
    typeof obj.sentenceId !== "string" ||
    typeof obj.occurrence !== "number" ||
    !Number.isInteger(obj.occurrence) ||
    obj.occurrence < 0
  ) {
    return null;
  }
  const pauseAfterMs = clampNarrationPauseMs(
    typeof obj.pauseAfterMs === "number" ? obj.pauseAfterMs : undefined
  );
  const fishAudio = parseFishAudioDirectives(obj.fishAudio);
  return {
    sceneKey: obj.sceneKey,
    sentenceId: obj.sentenceId,
    occurrence: obj.occurrence,
    pauseAfterMs,
    ...(fishAudio ? { fishAudio } : {}),
  };
}

export function parseNarrationDirectivesSidecar(
  json: unknown
): NarrationDirectivesSidecar {
  if (!json || typeof json !== "object") {
    throw new Error("Narration directives sidecar must be an object");
  }
  const obj = json as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new Error(`Unsupported narration directives version: ${String(obj.version)}`);
  }
  if (!Array.isArray(obj.turns)) {
    throw new Error("Narration directives sidecar.turns must be an array");
  }

  const turns: NarrationDirectiveRecord[] = [];
  const seen = new Set<string>();

  for (const raw of obj.turns) {
    const turn = normalizeNarrationDirectiveRecord(raw);
    if (!turn) {
      throw new Error(`Invalid narration directive turn: ${JSON.stringify(raw)}`);
    }
    const key = narrationDirectiveKey(turn);
    if (seen.has(key)) {
      throw new Error(`Duplicate narration directive key: ${key}`);
    }
    seen.add(key);
    turns.push(turn);
  }

  return {
    version: 1,
    updatedAt:
      typeof obj.updatedAt === "string" ? obj.updatedAt : new Date().toISOString(),
    turns,
  };
}

export function toNarrationAudio(
  record: NarrationAudioDirectives
): NarrationAudio {
  return {
    pauseAfterMs: record.pauseAfterMs,
    ...(record.fishAudio ? { fishAudio: record.fishAudio } : {}),
  };
}

/**
 * Merge sidecar directives onto narration scene sentences (by order occurrence).
 * Throws when coverage is incomplete or sidecar keys are unmatched.
 */
export function applyNarrationDirectivesToCatalogScenes(
  scenes: Record<string, Scene>,
  sidecar: NarrationDirectivesSidecar,
  options?: { requireFullCoverage?: boolean }
): Record<string, Scene> {
  const requireFullCoverage = options?.requireFullCoverage !== false;
  const byKey = new Map(
    sidecar.turns.map((t) => [narrationDirectiveKey(t), t] as const)
  );
  const used = new Set<string>();

  const next: Record<string, Scene> = {};

  for (const [sceneKey, scene] of Object.entries(scenes)) {
    if (scene.format !== "narration") {
      next[sceneKey] = scene;
      continue;
    }

    const occurrenceById = new Map<string, number>();
    const sentences: Sentence[] = scene.sentences.map((sentence) => {
      const occurrence = occurrenceById.get(sentence.id) ?? 0;
      occurrenceById.set(sentence.id, occurrence + 1);
      const key = narrationDirectiveKey({
        sceneKey,
        sentenceId: sentence.id,
        occurrence,
      });
      const record = byKey.get(key);
      if (!record) {
        if (requireFullCoverage) {
          throw new Error(
            `Missing narration directive for ${key} (${sentence.english.slice(0, 60)})`
          );
        }
        return sentence;
      }
      used.add(key);
      return {
        ...sentence,
        narrationAudio: toNarrationAudio(record),
      };
    });

    next[sceneKey] = { ...scene, sentences };
  }

  if (requireFullCoverage) {
    for (const turn of sidecar.turns) {
      const key = narrationDirectiveKey(turn);
      if (!used.has(key)) {
        throw new Error(
          `Unmatched narration directive (source changed?): ${key}`
        );
      }
    }
  }

  return next;
}

export function listNarrationTurnKeys(
  scenes: Record<string, Scene>
): NarrationDirectiveTurnKey[] {
  const keys: NarrationDirectiveTurnKey[] = [];
  for (const [sceneKey, scene] of Object.entries(scenes)) {
    if (scene.format !== "narration") continue;
    const occurrenceById = new Map<string, number>();
    for (const sentence of scene.sentences) {
      const occurrence = occurrenceById.get(sentence.id) ?? 0;
      occurrenceById.set(sentence.id, occurrence + 1);
      keys.push({
        sceneKey,
        sentenceId: sentence.id,
        occurrence,
      });
    }
  }
  return keys;
}
