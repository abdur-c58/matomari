"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "rounded-2xl border border-border bg-surface text-foreground shadow-md",
          success: "border-success/30",
          error: "border-destructive/30",
        },
      }}
    />
  );
}
