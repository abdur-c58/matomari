export type UiFont = "bitter" | "red-hat-display";

export const DEFAULT_UI_FONT: UiFont = "bitter";

export const UI_FONT_OPTIONS: {
  value: UiFont;
  label: string;
  description: string;
  family: string;
}[] = [
  {
    value: "bitter",
    label: "Bitter",
    description: "Warm serif — default for headings and UI text",
    family: '"Bitter", Georgia, "Times New Roman", serif',
  },
  {
    value: "red-hat-display",
    label: "Red Hat Display",
    description: "Geometric sans — the original Matomari typeface",
    family: '"Red Hat Display", system-ui, sans-serif',
  },
];

export function resolveUiFont(value: UiFont | undefined | null): UiFont {
  if (value === "red-hat-display") return "red-hat-display";
  return DEFAULT_UI_FONT;
}

export function getUiFontFamily(font: UiFont | undefined | null): string {
  const resolved = resolveUiFont(font);
  return UI_FONT_OPTIONS.find((o) => o.value === resolved)!.family;
}

export function getUiFontLabel(font: UiFont | undefined | null): string {
  const resolved = resolveUiFont(font);
  return UI_FONT_OPTIONS.find((o) => o.value === resolved)!.label;
}
