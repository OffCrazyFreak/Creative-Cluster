import { LOCALES, type AppLocale } from "@/constants/locales";
import { getLocale, localizeUrl } from "@/paraglide/runtime";
import { site } from "@/sites";

// Absolute URLs always start from the site's configured origin, never the request host.
export function absoluteUrl(path: string, locale: AppLocale = getLocale()) {
  return localizeUrl(new URL(path, site.origin), { locale }).href;
}

interface ILink {
  rel: string;
  href: string;
  hrefLang?: string;
}

// An alternate must never point at a noindex page, so pass `locales` when some languages are noindex.
export function indexableLinks(
  path: string,
  locales: readonly AppLocale[] = LOCALES,
): ILink[] {
  const fallback = locales.includes(site.baseLocale)
    ? site.baseLocale
    : locales[0];
  return [
    { rel: "canonical", href: absoluteUrl(path) },
    ...locales.map((locale) => ({
      rel: "alternate",
      hrefLang: locale,
      href: absoluteUrl(path, locale),
    })),
    {
      rel: "alternate",
      hrefLang: "x-default",
      href: absoluteUrl(path, fallback),
    },
  ];
}

// Canonical only, for pages that must not advertise alternates (filtered or noindex variants).
export function canonicalLink(path: string): ILink {
  return { rel: "canonical", href: absoluteUrl(path) };
}
