"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SHORTCUTS_DISMISS_KEY } from "@/lib/constants/branding";
import { cn } from "@/lib/utils";

const STORAGE_KEY = SHORTCUTS_DISMISS_KEY;

export function ShortcutsHint({
  shortcuts,
  className,
}: {
  shortcuts: { keys: string; label: string }[];
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const desktop = window.matchMedia("(min-width: 768px) and (hover: hover)");
    const dismissed = localStorage.getItem(STORAGE_KEY) === "1";
    setVisible(desktop.matches && !dismissed);

    const onChange = () => {
      setVisible(desktop.matches && localStorage.getItem(STORAGE_KEY) !== "1");
    };
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  if (!visible || shortcuts.length === 0) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  return (
    <div
      className={cn(
        "hidden md:mb-4 md:flex md:flex-wrap md:items-center md:gap-3 md:rounded-xl md:border md:border-border md:bg-surface-raised md:px-3 md:py-2",
        className
      )}
    >
      <span className="text-xs font-medium text-muted">Shortcuts</span>
      {shortcuts.map((s) => (
        <span key={s.keys} className="flex items-center gap-1.5 text-xs text-muted">
          <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-foreground">
            {s.keys}
          </kbd>
          {s.label}
        </span>
      ))}
      <Button variant="ghost" size="icon" className="ml-auto h-7 w-7" onClick={dismiss} aria-label="Dismiss">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
