import { SITE_CONFIGS } from "./site-configs.ts";
import type { SiteId } from "./site-id.ts";

type LocalizedPattern = [locale: string, pattern: string];

// The site's own language is unprefixed and the other one lives under /en or /hr.
// The exact root pattern comes first so the home page is /en, not /en/.
export function localeUrlPatterns(siteId: SiteId) {
  const { baseLocale, secondLocale } = SITE_CONFIGS[siteId];

  return [
    {
      pattern: "/",
      localized: [
        [secondLocale, `/${secondLocale}`],
        [baseLocale, "/"],
      ] satisfies LocalizedPattern[],
    },
    {
      pattern: "/:path(.*)?",
      localized: [
        [secondLocale, `/${secondLocale}/:path(.*)?`],
        [baseLocale, "/:path(.*)?"],
      ] satisfies LocalizedPattern[],
    },
  ];
}
