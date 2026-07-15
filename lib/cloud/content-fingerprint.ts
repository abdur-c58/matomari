/** Stable content fingerprint for English identity (collision detection). */
export function contentFingerprint(english: string): string {
  const normalized = english.trim().toLowerCase().replace(/\s+/g, " ");
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fp_${(hash >>> 0).toString(16).padStart(8, "0")}_${normalized.length}`;
}
