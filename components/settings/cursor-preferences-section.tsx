"use client";

import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export function CursorPreferencesSection({
  useStandardCursor,
  onChange,
}: {
  useStandardCursor: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Card className="mb-6 p-4">
      <Label className="text-base">Cursor</Label>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Matomari uses a custom cursor in the app. Turn this on if you prefer your system
        cursor instead. Marketing pages always keep the custom cursor.
      </p>

      <div className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-border p-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">Use standard cursor</p>
          <p className="mt-1 text-sm text-muted">
            Show the normal OS pointer in the dashboard and study screens.
          </p>
        </div>
        <Switch
          checked={useStandardCursor}
          onCheckedChange={onChange}
          aria-label="Use standard cursor"
        />
      </div>
    </Card>
  );
}
