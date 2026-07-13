"use client";

import { useCallback, useMemo, useState } from "react";
import {
  getCanonicalStudyUnitOrder,
  studyUnitKey,
  type StudyUnitRef,
  type StudyUnitSummary,
} from "@/lib/services/study-unit-service";

export function useStudyUnitSelection(units: StudyUnitSummary[]) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  const ordered = useMemo(() => getCanonicalStudyUnitOrder(units), [units]);
  const keyOrder = useMemo(
    () => ordered.map((u) => studyUnitKey(u.ref)),
    [ordered]
  );

  const toggle = useCallback(
    (ref: StudyUnitRef, index: number, shiftKey: boolean) => {
      const key = studyUnitKey(ref);
      setSelectedKeys((prev) => {
        const next = new Set(prev);

        if (shiftKey && lastClickedIndex !== null) {
          const start = Math.min(lastClickedIndex, index);
          const end = Math.max(lastClickedIndex, index);
          for (let i = start; i <= end; i++) {
            next.add(keyOrder[i]);
          }
          return next;
        }

        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
      setLastClickedIndex(index);
    },
    [keyOrder, lastClickedIndex]
  );

  const clear = useCallback(() => {
    setSelectedKeys(new Set());
    setLastClickedIndex(null);
  }, []);

  const selectedRefs = useMemo(() => {
    return ordered
      .filter((u) => selectedKeys.has(studyUnitKey(u.ref)))
      .map((u) => u.ref);
  }, [ordered, selectedKeys]);

  const isSelected = useCallback(
    (ref: StudyUnitRef) => selectedKeys.has(studyUnitKey(ref)),
    [selectedKeys]
  );

  return {
    ordered,
    selectedKeys,
    selectedRefs,
    isSelected,
    toggle,
    clear,
    selectionCount: selectedKeys.size,
  };
}
