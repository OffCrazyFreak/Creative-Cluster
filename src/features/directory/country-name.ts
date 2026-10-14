import type { AppLocale } from "@/constants/locales";

export function countryName(code: string, locale: AppLocale): string {
  return (
    new Intl.DisplayNames([locale], { type: "region" }).of(
      code.toUpperCase(),
    ) ?? code
  );
}

// "none" makes unknown codes return undefined, so only real ISO 3166 regions pass.
export function isKnownCountry(code: string): boolean {
  if (!/^[a-zA-Z]{2}$/.test(code)) return false;
  return (
    new Intl.DisplayNames(["en"], { type: "region", fallback: "none" }).of(
      code.toUpperCase(),
    ) !== undefined
  );
}
