import { APP_NAME } from "@/lib/constants/branding";

export const LEGAL_OPERATOR = "Abdur";
export const LEGAL_OPERATOR_DBA = APP_NAME;
export const LEGAL_CONTACT_EMAIL = "support@matomari.com";
export const LEGAL_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.matomari.com";

/** ISO date string for the current published Terms / Privacy effective date. */
export const LEGAL_EFFECTIVE_DATE = "2026-07-27";

export function formatLegalDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
