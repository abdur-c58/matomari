import type { Dialect } from "@/lib/constants/dialect";

export const PREFERENCES_PATH = "/settings/preferences";

export function preferencesPathWithReturn(returnTo?: string): string {
  if (!returnTo) return PREFERENCES_PATH;
  return `${PREFERENCES_PATH}?returnTo=${encodeURIComponent(returnTo)}`;
}

export function isDialectConfigured(settings: {
  dialectChosen?: boolean;
}): boolean {
  return settings.dialectChosen === true;
}

export function parseReturnTo(searchParams: URLSearchParams): string {
  const raw = searchParams.get("returnTo");
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export function dialectChangedRequiresRetranslation(
  previous: Dialect | undefined,
  next: Dialect
): boolean {
  return Boolean(previous && previous !== next);
}
