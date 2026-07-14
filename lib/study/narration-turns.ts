import type { NarrationSpeaker, Sentence } from "@/types/sentence";

export type NarrationTurn =
  | {
      kind: "pair";
      a: Sentence;
      b: Sentence;
      aIndex: number;
      bIndex: number;
    }
  | {
      kind: "single";
      sentence: Sentence;
      index: number;
    };

function speakerOf(sentence: Sentence): NarrationSpeaker | undefined {
  return sentence.speaker === "A" || sentence.speaker === "B"
    ? sentence.speaker
    : undefined;
}

/** Group consecutive A→B sentences into dialogue turns for narration browse UI. */
export function groupNarrationTurns(sentences: Sentence[]): NarrationTurn[] {
  const turns: NarrationTurn[] = [];
  let i = 0;

  while (i < sentences.length) {
    const current = sentences[i]!;
    const next = sentences[i + 1];

    if (
      speakerOf(current) === "A" &&
      next &&
      speakerOf(next) === "B"
    ) {
      turns.push({
        kind: "pair",
        a: current,
        b: next,
        aIndex: i,
        bIndex: i + 1,
      });
      i += 2;
      continue;
    }

    turns.push({ kind: "single", sentence: current, index: i });
    i += 1;
  }

  return turns;
}
