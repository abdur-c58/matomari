import { Card } from "@/components/ui/card";

export function PreStudyIntro() {
  return (
    <Card className="mb-6 space-y-4 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          What this is for
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          Pre-study is immersion prep: paste native Japanese text before you watch or listen,
          see what you already know from your library, and spot gaps to study first so the
          real content feels less overwhelming.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-surface-raised/60 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Example
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          You found a 10-minute café vlog on YouTube. Paste the Japanese transcript here,
          tap <span className="font-medium text-foreground">Analyze transcript</span> to
          highlight unfamiliar phrases, review related sentences you already have, then create
          a small scene from the video so you can shadow and recall those lines before
          watching.
        </p>
      </div>
    </Card>
  );
}
