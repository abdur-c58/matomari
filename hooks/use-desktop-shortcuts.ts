"use client";

import { useEffect } from "react";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export interface DesktopShortcutHandlers {
  onSpace?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onReveal?: () => void;
  onEscape?: () => void;
}

export function useDesktopShortcuts(handlers: DesktopShortcutHandlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const desktopQuery = window.matchMedia("(min-width: 768px) and (hover: hover)");

    const onKeyDown = (e: KeyboardEvent) => {
      if (!desktopQuery.matches) return;
      if (isTypingTarget(e.target)) return;

      if (e.key === " " && handlers.onSpace) {
        e.preventDefault();
        handlers.onSpace();
      } else if (e.key === "ArrowLeft" && handlers.onArrowLeft) {
        e.preventDefault();
        handlers.onArrowLeft();
      } else if (e.key === "ArrowRight" && handlers.onArrowRight) {
        e.preventDefault();
        handlers.onArrowRight();
      } else if (e.key === "?" && handlers.onReveal) {
        e.preventDefault();
        handlers.onReveal();
      } else if (e.key === "Escape" && handlers.onEscape) {
        handlers.onEscape();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers, enabled]);
}
