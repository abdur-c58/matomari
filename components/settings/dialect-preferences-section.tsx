"use client";

import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { DIALECT_OPTIONS } from "@/lib/constants/dialect";
import type { Dialect } from "@/lib/constants/dialect";
import { cn } from "@/lib/utils";

export function DialectPreferencesSection({
  dialect,
  onChange,
}: {
  dialect: Dialect;
  onChange: (dialect: Dialect) => void;
}) {
  return (
    <Card className="mb-6 p-4">
      <Label className="text-base">Japanese dialect</Label>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Choose how sentences are translated and spoken. Kansai uses a separate voice and phonetic
        script for accent.
      </p>

      <div className="mt-4 space-y-2">
        {DIALECT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "w-full rounded-xl border p-4 text-left transition-colors",
              dialect === option.value
                ? "border-foreground bg-foreground/5"
                : "border-border hover:border-foreground/30"
            )}
          >
            <p className="font-medium text-foreground">{option.label}</p>
            <p className="mt-1 text-sm text-muted">{option.description}</p>
          </button>
        ))}
      </div>
    </Card>
  );
}
