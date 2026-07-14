/**
 * Conservative [name] personalization for premade English seeds.
 * Shared by build-premade-catalog and apply-name-placeholders.
 *
 * Only slots where the LEARNER says/uses their own name while speaking:
 * - self-intro ("My name is …")
 * - booking/reservation under their name
 *
 * Do NOT replace third-person story names, vocatives addressing someone else,
 * or title+surname pairs (breaks dialogue gender/identity and mini-story context).
 */

/** Returns updated English with [name], or null if unchanged / not appropriate. */
export function applyNamePlaceholderToEnglish(english: string): string | null {
  // Pet names are not the learner.
  if (/\b(dog|cat|pet|bird|fish|puppy|kitten)['’]?s name\b/i.test(english)) {
    return null;
  }

  let next = english;

  next = next.replace(
    /^My name is [A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ''\-]+\.?$/u,
    "My name is [name]."
  );
  next = next.replace(
    /^My first name is [A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ''\-]+\.?$/u,
    "My first name is [name]."
  );
  next = next.replace(
    /^My last name is [A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ''\-]+\.?$/u,
    "My last name is [name]."
  );

  // Reservation: speaker books under their own name.
  next = next.replace(
    /\bunder the name [A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ''\-]+(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ''\-]+)?\b/gu,
    "under the name [name]"
  );

  if (next === english || !next.includes("[name]")) return null;
  return next;
}

export function withNamePlaceholder(english: string): string {
  return applyNamePlaceholderToEnglish(english) ?? english;
}
