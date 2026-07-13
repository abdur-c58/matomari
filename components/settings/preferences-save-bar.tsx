"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PreferencesSaveBar({
  visible,
  onSave,
  saving,
  hasUnsavedChanges,
  className,
}: {
  visible: boolean;
  onSave: () => void;
  saving: boolean;
  hasUnsavedChanges: boolean;
  className?: string;
}) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4",
        "bottom-[max(1rem,env(safe-area-inset-bottom,0px))]",
        className
      )}
    >
      <Button
        type="button"
        className={cn(
          "pointer-events-auto min-w-[min(100%,14rem)] rounded-full px-8 shadow-lg shadow-black/15 transition-shadow hover:shadow-xl",
          hasUnsavedChanges && "ring-2 ring-primary/25"
        )}
        onClick={onSave}
        loading={saving}
      >
        Save preferences
      </Button>
    </div>
  );
}
