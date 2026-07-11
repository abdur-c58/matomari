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
    description: "Osaka/Kyoto ben — casual, regional flavor and endings",
  },
];

export function getDialectLabel(dialect: Dialect): string {
  return DIALECT_OPTIONS.find((o) => o.value === dialect)?.label ?? dialect;
}
