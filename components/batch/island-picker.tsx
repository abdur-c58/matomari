"use client";

import type { IslandSummary } from "@/lib/services/study-focus-service";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/empty-state";
import { cn } from "@/lib/utils";

export function IslandPicker({
  islands,
  selectedKey,
  onSelect,
}: {
  islands: IslandSummary[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  if (islands.length === 0) {
    return (
      <EmptyState
        title="No islands yet"
        description="Create one with AI below, or import islands with your dataset later."
      />
    );
  }

  return (
    <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3">
      {islands.map((island) => {
        const selected = island.key === selectedKey;

        return (
          <div key={island.key} className="group relative">
            <button
              type="button"
              onClick={() => onSelect(island.key)}
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
                    <p className="font-semibold text-foreground">{island.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{island.description}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {island.sentenceCount}
                  </Badge>
                </div>
                {island.studiedCount > 0 && (
                  <p className="mt-2 text-xs text-muted">{island.studiedCount} studied</p>
                )}
                {island.subtopics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {island.subtopics.slice(0, 4).map((st) => (
                      <Badge key={st} variant="outline" className="text-xs">
                        {st.replace(/_/g, " ")}
                      </Badge>
                    ))}
                    {island.subtopics.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{island.subtopics.length - 4}
                      </Badge>
                    )}
                  </div>
                )}
              </Card>
            </button>

            <div className="island-preview pointer-events-none absolute left-full top-0 z-20 ml-3 hidden w-56 rounded-xl border border-border bg-surface p-3 shadow-md opacity-0 transition-opacity duration-150 md:block lg:w-64">
              <p className="text-xs font-medium text-muted">Preview</p>
              <p className="mt-1 text-sm font-medium text-foreground">{island.title}</p>
              <p className="mt-2 text-xs text-muted">
                {island.sentenceCount} sentences · {island.studiedCount} studied
              </p>
              {island.subtopics.length > 0 && (
                <p className="mt-2 text-xs text-muted">
                  Topics: {island.subtopics.slice(0, 5).map((s) => s.replace(/_/g, " ")).join(", ")}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
