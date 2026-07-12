"use client";

import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function DialectPreferencesSection({
  showKansaiDialect,
  kansaiAsPrimary,
  onShowKansaiChange,
  onKansaiPrimaryChange,
}: {
  showKansaiDialect: boolean;
  kansaiAsPrimary: boolean;
  onShowKansaiChange: (value: boolean) => void;
  onKansaiPrimaryChange: (value: boolean) => void;
}) {
  return (
    <Card className="mb-6 p-4">
      <Label className="text-base">Japanese dialect</Label>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Study one progress track per sentence. Enable Kansai to generate and compare a second
        translation alongside Standard Japanese.
      </p>

      <div className="mt-4 space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">Show Kansai dialect</p>
            <p className="mt-1 text-sm text-muted">
              Generate Kansai translations and view them in the library alongside Standard Japanese.
            </p>
          </div>
          <Switch
            checked={showKansaiDialect}
            onCheckedChange={onShowKansaiChange}
            aria-label="Show Kansai dialect"
          />
        </div>

        <div
          className={cn(
            "flex items-start justify-between gap-4 rounded-xl border border-border p-4 transition-opacity",
            !showKansaiDialect && "pointer-events-none opacity-40"
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">Set Kansai as primary</p>
            <p className="mt-1 text-sm text-muted">
              Use Kansai for Today, Listen, Recall, and library rows by default. You can still
              switch to Standard per sentence when expanded.
            </p>
          </div>
          <Switch
            checked={kansaiAsPrimary}
            onCheckedChange={onKansaiPrimaryChange}
            disabled={!showKansaiDialect}
            aria-label="Set Kansai as primary"
          />
        </div>
      </div>
    </Card>
  );
}
