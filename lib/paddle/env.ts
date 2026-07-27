/** Read a server env var when present (never throws). */
export function readServerEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function paddlePriceIdsFromEnv(): {
  plusMonthly?: string;
  plusAnnual?: string;
  proMonthly?: string;
  proAnnual?: string;
  configured: boolean;
} {
  const plusMonthly = readServerEnv("PADDLE_PRICE_PLUS_MONTHLY");
  const plusAnnual = readServerEnv("PADDLE_PRICE_PLUS_ANNUAL");
  const proMonthly = readServerEnv("PADDLE_PRICE_PRO_MONTHLY");
  const proAnnual = readServerEnv("PADDLE_PRICE_PRO_ANNUAL");
  const configured = Boolean(
    plusMonthly && plusAnnual && proMonthly && proAnnual
  );
  return {
    plusMonthly,
    plusAnnual,
    proMonthly,
    proAnnual,
    configured,
  };
}

/** Paddle notification secrets are usually `pdl_ntfset_…`; tolerate pasted `ntfset_…`. */
export function normalizePaddleWebhookSecret(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("pdl_ntfset_")) return trimmed;
  if (trimmed.startsWith("ntfset_")) return `pdl_${trimmed}`;
  return trimmed;
}
