export const LOCALES = ["hr", "en"] as const;

export type AppLocale = (typeof LOCALES)[number];

// Each language is named in itself so a reader can find theirs.
export const LOCALE_NAMES: Record<AppLocale, string> = {
  hr: "Hrvatski",
  en: "English",
};
