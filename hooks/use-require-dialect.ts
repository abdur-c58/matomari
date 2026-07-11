"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { preferencesPathWithReturn } from "@/lib/utils/dialect-preferences";

export function useRequireDialectBeforeTranslate() {
  const router = useRouter();
  const { progress } = useApp();

  return (): boolean => {
    if (progress.settings.dialectChosen) return true;
    router.push(preferencesPathWithReturn(window.location.pathname + window.location.search));
    return false;
  };
}
