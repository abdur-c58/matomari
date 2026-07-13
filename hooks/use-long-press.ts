"use client";

import { useCallback, useRef } from "react";

type LongPressHandlers = {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchMove: () => void;
  onTouchCancel: () => void;
};

export function useLongPress(
  onLongPress: () => void,
  { delay = 450, disabled = false }: { delay?: number; disabled?: boolean } = {}
) {
  const timerRef = useRef<number | null>(null);
  const triggeredRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const shouldIgnoreTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(
      target.closest("[data-long-press-ignore]") ||
        target.closest("button") ||
        target.closest("input")
    );
  }, []);

  const handlers: LongPressHandlers = {
    onTouchStart: (e) => {
      if (disabled || shouldIgnoreTarget(e.target)) return;
      triggeredRef.current = false;
      clear();
      timerRef.current = window.setTimeout(() => {
        triggeredRef.current = true;
        onLongPress();
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate(12);
        }
      }, delay);
    },
    onTouchEnd: clear,
    onTouchMove: clear,
    onTouchCancel: clear,
  };

  const consumeLongPress = useCallback(() => {
    const wasTriggered = triggeredRef.current;
    triggeredRef.current = false;
    return wasTriggered;
  }, []);

  return { handlers, consumeLongPress, triggeredRef };
}
