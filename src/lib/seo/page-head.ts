import { LOCALES, type AppLocale } from "@/constants/locales";
import { getLocale, localizeHref } from "@/paraglide/runtime";
import { site } from "@/sites";

interface IPageHeadInput {
  path: string;
  title: string;
  description: string;
  noindex?: boolean;
}

// Canonical and alternates come from the site origin, never from the request host.
export function pageHead({
  path,
  title,
  description,
  noindex,
}: IPageHeadInput) {
  function url(locale: AppLocale) {
    return `${site.origin}${localizeHref(path, { locale })}`;
  }
  return {
    meta: [
      { title: `${title} | ${site.name}` },
      { name: "description", content: description },
      ...(noindex ? [{ name: "robots", content: "noindex, follow" }] : []),
    ],
    links: [
      { rel: "canonical", href: url(getLocale()) },
      ...LOCALES.map((locale) => ({
        rel: "alternate",
        hrefLang: locale,
        href: url(locale),
      })),
      { rel: "alternate", hrefLang: "x-default", href: url(site.baseLocale) },
    ],
  };
}
