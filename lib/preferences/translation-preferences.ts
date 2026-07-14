import type { Dialect } from "@/lib/constants/dialect";
import { DEFAULT_DIALECT } from "@/lib/constants/dialect";
import { KANSAI_FEATURE_ENABLED } from "@/lib/constants/kansai-feature";
import type { AppSettings } from "@/types/progress";

export type TranslationPreferenceSettings = Pick<
  AppSettings,
  "showKansaiDialect" | "kansaiAsPrimary" | "dialect" | "dialectChosen"
>;

/** Which dialect variant is shown in study flows and library rows by default. */
export function getPrimaryTranslation(
  settings: TranslationPreferenceSettings
): Dialect {
  if (
    KANSAI_FEATURE_ENABLED &&
    settings.showKansaiDialect &&
    settings.kansaiAsPrimary
  ) {
    return "kansai";
  }
  return "standard";
}

/** The other dialect when Kansai is enabled, otherwise null. */
export function getAlternateTranslation(
  settings: TranslationPreferenceSettings
): Dialect | null {
  if (!KANSAI_FEATURE_ENABLED || !settings.showKansaiDialect) return null;
  return getPrimaryTranslation(settings) === "standard" ? "kansai" : "standard";
}

/** Migrate legacy dialect picker fields into toggle-based preferences. */
export function resolveTranslationSettings(
  settings: Partial<AppSettings>
): Pick<AppSettings, "showKansaiDialect" | "kansaiAsPrimary" | "dialect" | "dialectChosen"> {
  if (!KANSAI_FEATURE_ENABLED) {
    return {
      showKansaiDialect: false,
      kansaiAsPrimary: false,
      dialect: "standard",
      dialectChosen: true,
    };
  }

  const hasNewFields =
    settings.showKansaiDialect !== undefined || settings.kansaiAsPrimary !== undefined;

  let showKansaiDialect = settings.showKansaiDialect ?? false;
  let kansaiAsPrimary = settings.kansaiAsPrimary ?? false;

  if (!hasNewFields) {
    const legacyDialect = settings.dialect ?? DEFAULT_DIALECT;
    if (legacyDialect === "kansai" && settings.dialectChosen) {
      showKansaiDialect = true;
      kansaiAsPrimary = true;
    }
  }

  const dialect = getPrimaryTranslation({
    showKansaiDialect,
    kansaiAsPrimary,
    dialect: settings.dialect ?? DEFAULT_DIALECT,
    dialectChosen: settings.dialectChosen ?? true,
  });

  return {
    showKansaiDialect,
    kansaiAsPrimary,
    dialect,
    dialectChosen: true,
  };
}

export function summarizeTranslationPreferences(
  settings: TranslationPreferenceSettings
): string {
  if (!KANSAI_FEATURE_ENABLED || !settings.showKansaiDialect) {
    return "Standard Japanese";
  }
  if (settings.kansaiAsPrimary) {
    return "Kansai primary";
  }
  return "Standard · Kansai enabled";
}
