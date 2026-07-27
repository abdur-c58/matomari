"use client";

import type { SceneBrowseDisplay } from "@/lib/constants/scene-browse";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MODES: {
  value: SceneBrowseDisplay;
  label: string;
  shortLabel: string;
}[] = [
  { value: "en", label: "English only", shortLabel: "EN" },
  { value: "jp", label: "Japanese only", shortLabel: "JP" },
  { value: "both", label: "English and Japanese", shortLabel: "Both" },
];

function ModeGlyph({
  mode,
  className,
}: {
  mode: SceneBrowseDisplay;
  className?: string;
}) {
  if (mode === "en") {
    return (
      <span className={cn("text-[11px] font-semibold leading-none tracking-tight", className)}>
        Aa
      </span>
    );
  }

  if (mode === "jp") {
    return (
      <span className={cn("font-japanese text-sm leading-none", className)}>あ</span>
    );
  }

  return <Languages className={cn("h-3.5 w-3.5", className)} />;
}

export function DisplayModeToggle({
  value,
  onChange,
  compact = false,
}: {
  value: SceneBrowseDisplay;
  onChange: (mode: SceneBrowseDisplay) => void;
  compact?: boolean;
}) {
  return (
    <div className="inline-flex shrink-0 rounded-lg border border-border p-0.5">
      {MODES.map((mode) => (
        <Button
          key={mode.value}
          type="button"
          size="sm"
          variant={value === mode.value ? "default" : "ghost"}
          className={cn(compact ? "h-7 w-7 p-0" : "h-8 gap-1.5 px-2.5")}
          onClick={() => onChange(mode.value)}
          aria-label={mode.label}
        >
          <ModeGlyph mode={mode.value} />
          {!compact && <span className="text-xs">{mode.shortLabel}</span>}
        </Button>
      ))}
    </div>
  );
}
