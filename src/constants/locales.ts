export const LOCALES = ["hr", "en"] as const;

export type AppLocale = (typeof LOCALES)[number];
