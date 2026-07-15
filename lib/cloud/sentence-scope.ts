import type { TranslationScope } from "@/lib/supabase/durable-translations";

/** Premade/pathway seed IDs are shared catalog content. */
export function isCatalogLegacyId(legacyId: string): boolean {
  return (
    legacyId.startsWith("premade_sent_") ||
    legacyId.startsWith("premade_") ||
    /^pathway[-_]/i.test(legacyId) ||
    /^batch[-_]?\d+/i.test(legacyId)
  );
}

export function resolveTranslationScope(
  legacyId: string,
  ownerUserId?: string | null
): TranslationScope {
  if (isCatalogLegacyId(legacyId)) return "canonical";
  // Custom user sentences require an authenticated owner in online-first mode.
  return ownerUserId ? "user" : "canonical";
}
