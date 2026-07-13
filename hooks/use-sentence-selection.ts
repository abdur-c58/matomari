"use client";

import { useCallback, useMemo, useState } from "react";
import type { Sentence } from "@/types/sentence";

export function useSentenceSelection(sentences: Sentence[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  const orderedIds = useMemo(() => sentences.map((s) => s.id), [sentences]);

  const toggleSingle = useCallback((sentenceId: string, index: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sentenceId)) next.delete(sentenceId);
      else next.add(sentenceId);
      return next;
    });
    setLastClickedIndex(index);
  }, []);

  const toggleRangeTo = useCallback(
    (index: number) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (lastClickedIndex !== null) {
          const start = Math.min(lastClickedIndex, index);
          const end = Math.max(lastClickedIndex, index);
          for (let i = start; i <= end; i++) {
            next.add(orderedIds[i]);
          }
        }
        return next;
      });
      setLastClickedIndex(index);
    },
    [lastClickedIndex, orderedIds]
  );

  const toggle = useCallback(
    (sentenceId: string, index: number, shiftKey: boolean) => {
      if (shiftKey && lastClickedIndex !== null) {
        toggleRangeTo(index);
      } else {
        toggleSingle(sentenceId, index);
      }
    },
    [lastClickedIndex, toggleRangeTo, toggleSingle]
  );

  const enterSelectionAt = useCallback((sentenceId: string, index: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(sentenceId);
      return next;
    });
    setLastClickedIndex(index);
  }, []);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
    setLastClickedIndex(null);
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(orderedIds));
  }, [orderedIds]);

  const isSelected = useCallback(
    (sentenceId: string) => selectedIds.has(sentenceId),
    [selectedIds]
  );

  const selectedSentences = useMemo(
    () => sentences.filter((s) => selectedIds.has(s.id)),
    [sentences, selectedIds]
  );

  return {
    selectedIds,
    selectedSentences,
    isSelected,
    toggle,
    toggleSingle,
    toggleRangeTo,
    enterSelectionAt,
    clear,
    selectAll,
    selectionCount: selectedIds.size,
  };
}
