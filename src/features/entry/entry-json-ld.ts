import { safeHttpUrl } from "@/utils/safe-url";
import { absoluteUrl } from "@/utils/seo-links";

import type { IPublicEntry } from "./entry-schemas";

// Town only, by design: people never expose a street, and organizations keep their address on the page.
export function entryJsonLd(entry: IPublicEntry): Record<string, unknown> {
  const { city, countryCode } = entry.location;
  const sameAs = Object.values(entry.socials).flatMap(
    (url) => safeHttpUrl(url) ?? [],
  );
  const website = safeHttpUrl(entry.website);
  return {
    "@context": "https://schema.org",
    "@type": entry.kind === "person" ? "Person" : "Organization",
    name: entry.name,
    url: absoluteUrl(`/e/${entry.slug}`),
    ...(entry.descriptionText
      ? { description: entry.descriptionText.slice(0, 300) }
      : {}),
    ...(website
      ? { sameAs: [website, ...sameAs] }
      : sameAs.length
        ? { sameAs }
        : {}),
    ...(city || countryCode
      ? {
          address: {
            "@type": "PostalAddress",
            ...(city ? { addressLocality: city } : {}),
            ...(countryCode ? { addressCountry: countryCode } : {}),
          },
        }
      : {}),
  };
}
