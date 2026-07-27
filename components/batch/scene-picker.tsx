"use client";

import type { SceneSummary } from "@/lib/services/study-focus-service";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/empty-state";
import { cn } from "@/lib/utils";

export function ScenePicker({
  scenes,
  selectedKey,
  onSelect,
}: {
  scenes: SceneSummary[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  if (scenes.length === 0) {
    return (
      <EmptyState
        title="No scenes yet"
        description="Create one with AI or manually below, or import scenes with your dataset later."
      />
    );
  }

  return (
    <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3">
      {scenes.map((scene) => {
        const selected = scene.key === selectedKey;

        return (
          <div key={scene.key} className="group relative">
            <button
              type="button"
              onClick={() => onSelect(scene.key)}
              className="w-full text-left"
            >
              <Card
                className={cn(
                  "p-4 transition-all duration-150",
                  selected
                    ? "border-mode-meaning bg-mode-meaning/5 shadow-sm"
                    : "hover:border-mode-meaning/30 desktop-hover-lift"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{scene.title}</p>
                      {scene.complete && <Badge variant="success">Complete</Badge>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{scene.description}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {scene.sentenceCount}
                  </Badge>
                </div>
                {scene.studiedCount > 0 && (
                  <p className="mt-2 text-xs text-muted">{scene.studiedCount} studied</p>
                )}
                {scene.subtopics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {scene.subtopics.slice(0, 4).map((st) => (
                      <Badge key={st} variant="outline" className="text-xs">
                        {st.replace(/_/g, " ")}
                      </Badge>
                    ))}
                    {scene.subtopics.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{scene.subtopics.length - 4}
                      </Badge>
                    )}
                  </div>
                )}
              </Card>
            </button>

            <div className="scene-preview pointer-events-none absolute left-full top-0 z-20 ml-3 hidden w-56 rounded-xl border border-border bg-surface p-3 shadow-md opacity-0 transition-opacity duration-150 md:block lg:w-64">
              <p className="text-xs font-medium text-muted">Preview</p>
              <p className="mt-1 text-sm font-medium text-foreground">{scene.title}</p>
              <p className="mt-2 text-xs text-muted">
                {scene.sentenceCount} sentences · {scene.studiedCount} studied
              </p>
              {scene.subtopics.length > 0 && (
                <p className="mt-2 text-xs text-muted">
                  Topics: {scene.subtopics.slice(0, 5).map((s) => s.replace(/_/g, " ")).join(", ")}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
