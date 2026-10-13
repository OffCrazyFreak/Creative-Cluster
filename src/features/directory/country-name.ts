import type { AppLocale } from "@/constants/locales";

export function countryName(code: string, locale: AppLocale): string {
  return (
    new Intl.DisplayNames([locale], { type: "region" }).of(
      code.toUpperCase(),
    ) ?? code
  );
}
