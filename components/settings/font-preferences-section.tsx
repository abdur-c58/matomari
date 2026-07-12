"use client";

import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { UI_FONT_OPTIONS } from "@/lib/constants/ui-font";
import type { UiFont } from "@/lib/constants/ui-font";
import { cn } from "@/lib/utils";

export function FontPreferencesSection({
  uiFont,
  onChange,
}: {
  uiFont: UiFont;
  onChange: (font: UiFont) => void;
}) {
  return (
    <Card className="mb-6 p-4">
      <Label className="text-base">Font</Label>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Choose the typeface for menus, headings, and study UI. Japanese sentence text keeps its
        own reading fonts.
      </p>

      <div className="mt-4 space-y-2">
        {UI_FONT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "w-full rounded-xl border p-4 text-left transition-colors",
              uiFont === option.value
                ? "border-foreground bg-foreground/5"
                : "border-border hover:border-foreground/30"
            )}
          >
            <p className="font-medium text-foreground" style={{ fontFamily: option.family }}>
              {option.label}
            </p>
            <p className="mt-1 text-sm text-muted">{option.description}</p>
            <p
              className="mt-2 text-lg text-foreground/90"
              style={{ fontFamily: option.family }}
            >
              今日の勉強 — Good evening, Kotoshima
            </p>
          </button>
        ))}
      </div>
    </Card>
  );
}
