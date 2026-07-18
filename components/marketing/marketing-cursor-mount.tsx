"use client";

import { MarketingCustomCursor } from "@/components/marketing/custom-cursor";

/** Always-on custom cursor for public marketing routes (ignores app preference). */
export function MarketingCursorMount() {
  return <MarketingCustomCursor />;
}
