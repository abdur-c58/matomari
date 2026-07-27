/** Parts of Paddle's formatted total for count-up animation (no currency math). */
export type PriceDisplayParts = {
  prefix: string;
  suffix: string;
  decimals: number;
  decimalSeparator: "." | ",";
};

/** Derive animation parts from Paddle preview fields only. */
export function priceDisplayParts(
  formattedTotal: string,
  rawTotal: string
): PriceDisplayParts {
  const value = parseFloat(rawTotal);
  const fallback: PriceDisplayParts = {
    prefix: "",
    suffix: "",
    decimals: 2,
    decimalSeparator: ".",
  };
  if (!Number.isFinite(value)) return fallback;

  const numMatch = formattedTotal.match(/[\d.,]+/);
  if (!numMatch) return fallback;

  const numIndex = formattedTotal.indexOf(numMatch[0]);
  const numStr = numMatch[0];
  const decimalSeparator = numStr.includes(",") ? "," : ".";
  const decimals = (numStr.split(/[.,]/)[1] ?? "").length;

  return {
    prefix: formattedTotal.slice(0, numIndex),
    suffix: formattedTotal.slice(numIndex + numStr.length),
    decimals,
    decimalSeparator,
  };
}

export function formatAnimatedAmount(
  value: number,
  parts: PriceDisplayParts
): string {
  let numStr = value.toFixed(parts.decimals);
  if (parts.decimalSeparator === ",") {
    numStr = numStr.replace(".", ",");
  }
  return `${parts.prefix}${numStr}${parts.suffix}`;
}
