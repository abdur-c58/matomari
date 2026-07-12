"use client";

import { useCallback } from "react";
import type { Dialect } from "@/lib/constants/dialect";
import type { Sentence, TranslatedFields } from "@/types/sentence";
import { useApp } from "@/components/providers/app-provider";
import { getSentenceTranslationFields } from "@/lib/services/dialect-translation-service";
import { getLibrarySentences } from "@/lib/services/library-service";

export function useSentenceTranslation(sentenceId: string, dialect: Dialect): TranslatedFields | null {
  const { getSentenceTranslation } = useApp();
  return getSentenceTranslation(sentenceId, dialect);
}

export function useSentenceTranslationFromSentence(
  sentence: Sentence,
  dialect: Dialect
): TranslatedFields | null {
  const { userLibrary, dataset } = useApp();

  const pathwaySentence = dataset
    ? getLibrarySentences(dataset).find((s) => s.id === sentence.id)
    : undefined;

  return getSentenceTranslationFields(
    sentence.id,
    dialect,
    userLibrary?.sentenceTranslations,
    pathwaySentence ?? sentence
  );
}

export function useGetSentenceTranslation() {
  const { getSentenceTranslation } = useApp();
  return useCallback(
    (sentenceId: string, dialect: Dialect) => getSentenceTranslation(sentenceId, dialect),
    [getSentenceTranslation]
  );
}
