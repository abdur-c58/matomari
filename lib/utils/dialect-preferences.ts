export const PREFERENCES_PATH = "/settings/preferences";

export function preferencesPathWithReturn(returnTo?: string): string {
  if (!returnTo) return PREFERENCES_PATH;
  return `${PREFERENCES_PATH}?returnTo=${encodeURIComponent(returnTo)}`;
}

export function parseReturnTo(searchParams: URLSearchParams): string {
  const raw = searchParams.get("returnTo");
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}
