import type { Dialect } from "@/lib/constants/dialect";

export function shouldShowKansaiPhonetic(
  dialect: Dialect,
  reading?: string | null,
  phoneticReading?: string | null
): boolean {
  if (dialect !== "kansai") return false;
  const phonetic = phoneticReading?.trim();
  if (!phonetic) return false;
  const standard = reading?.trim();
  if (standard && standard === phonetic) return false;
  return true;
}
