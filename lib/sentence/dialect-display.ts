import type { TranslatedFields } from "@/types/sentence";

/** True when two dialect variants should be shown side by side (not identical). */
export function dialectTranslationFieldsDiffer(
  a: TranslatedFields | null | undefined,
  b: TranslatedFields | null | undefined
): boolean {
  const aJp = a?.japanese?.trim();
  const bJp = b?.japanese?.trim();
  if (!aJp || !bJp) return Boolean(aJp !== bJp);

  if (aJp !== bJp) return true;
  if ((a!.reading ?? "").trim() !== (b!.reading ?? "").trim()) return true;

  const bPhonetic = b!.phonetic_reading?.trim();
  if (bPhonetic && bPhonetic !== (a!.phonetic_reading ?? "").trim()) return true;

  const bRomaji = b!.romaji?.trim();
  if (bRomaji && bRomaji !== (a!.romaji ?? "").trim()) return true;

  return false;
}
