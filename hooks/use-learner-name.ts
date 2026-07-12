"use client";

import { useSession } from "next-auth/react";
import { useApp } from "@/components/providers/app-provider";
import { getLearnerDisplayName } from "@/lib/sentence/learner-name";

export function useLearnerName(): string | null {
  const { data: session } = useSession();
  const { progress } = useApp();
  return getLearnerDisplayName(session?.user, progress.settings);
}
