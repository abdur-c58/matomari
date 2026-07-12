"use client";

import { useCallback } from "react";

/** @deprecated Dialect is no longer a gate — translation always uses primary preference. */
export function useRequireDialectBeforeTranslate() {
  return useCallback((): boolean => true, []);
}
