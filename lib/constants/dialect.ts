export type Dialect = "standard" | "kansai";

export const DIALECTS: Dialect[] = ["standard", "kansai"];

export const DEFAULT_DIALECT: Dialect = "standard";

export const DIALECT_OPTIONS: {
  value: Dialect;
  label: string;
  description: string;
}[] = [
  {
    value: "standard",
    label: "Standard Japanese",
    description: "Tokyo-based hyōjungo — neutral, widely understood",
  },
  {
    value: "kansai",
    label: "Kansai dialect",
    description:
      "Osaka/Kyoto ben — regional wording plus a phonetic TTS script so the voice sounds Kansai",
  },
];

export function getDialectLabel(dialect: Dialect): string {
  return DIALECT_OPTIONS.find((o) => o.value === dialect)?.label ?? dialect;
}
