/** Paddle Money amounts are minor units (e.g. cents) as strings. */
export function formatPaddleMoney(
  amount: string | null | undefined,
  currencyCode = "USD"
): string {
  if (!amount) return "$0.00";
  const minor = Number(amount);
  if (!Number.isFinite(minor)) return "$0.00";
  const major = minor / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(major);
  } catch {
    return `$${major.toFixed(2)}`;
  }
}
