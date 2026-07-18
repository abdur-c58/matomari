"use client";

import { useSession } from "next-auth/react";
import { MarketingCustomCursor } from "@/components/marketing/custom-cursor";

/** Custom cursor on the sign-in screen — preference only applies after auth. */
export function PreAuthCustomCursor() {
  const { status } = useSession();
  if (status === "authenticated") return null;
  return <MarketingCustomCursor />;
}
