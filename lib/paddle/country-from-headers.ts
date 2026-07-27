/** ISO 3166-1 alpha-2 from Vercel (or similar) edge headers. */
export function countryFromRequestHeaders(
  headers: Headers
): string | undefined {
  const raw = headers.get("x-vercel-ip-country")?.trim().toUpperCase();
  if (!raw || raw.length !== 2) return undefined;
  // Vercel uses XX when unknown — never pass to Paddle.
  if (raw === "XX") return undefined;
  return raw;
}
