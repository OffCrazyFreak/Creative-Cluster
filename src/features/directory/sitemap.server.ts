import { LOCALES, type AppLocale } from "@/constants/locales";
import { listSitemapOpportunities } from "@/features/opportunities/public-opportunities.server";
import { site } from "@/sites";
import { absoluteUrl } from "@/utils/seo-links";

import {
  listDirectoryFacets,
  listSitemapEntries,
} from "./directory-list.server";

const STATIC_PATHS = [
  "/",
  "/directory",
  "/opportunities",
  "/about",
  "/help",
  "/apply",
  "/privacy",
  "/terms",
  "/imprint",
  "/accessibility",
];

interface ISitemapPage {
  path: string;
  lastmod?: Date;
  // Indexable language variants; all of them when omitted.
  locales?: readonly AppLocale[];
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Each indexable language variant is its own <url> with the full reciprocal alternate set.
function urlBlocks({ path, lastmod, locales = LOCALES }: ISitemapPage) {
  const defaultLocale = locales.includes(site.baseLocale)
    ? site.baseLocale
    : locales[0];
  const alternates = [
    ...locales.map(
      (locale) =>
        `<xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(absoluteUrl(path, locale))}"/>`,
    ),
    `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(absoluteUrl(path, defaultLocale))}"/>`,
  ].join("");
  return locales
    .map(
      (locale) =>
        `<url><loc>${escapeXml(absoluteUrl(path, locale))}</loc>${
          lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : ""
        }${alternates}</url>`,
    )
    .join("");
}

// Only public, indexable pages: never account, admin or filtered URLs.
export async function buildSitemap(): Promise<string> {
  const [entries, facets, opportunities] = await Promise.all([
    listSitemapEntries(),
    listDirectoryFacets(),
    listSitemapOpportunities(),
  ]);
  const pages: ISitemapPage[] = [
    ...STATIC_PATHS.map((path) => ({ path })),
    ...facets.tags.map((item) => ({ path: `/directory/tag/${item.slug}` })),
    ...facets.countries.map((item) => ({
      path: `/directory/country/${item.key.toLowerCase()}`,
    })),
    ...entries.map((item) => ({
      path: `/e/${item.slug}`,
      lastmod: item.updatedAt,
    })),
    ...opportunities.map((item) => ({
      path: `/opportunities/${item.id}`,
      lastmod: item.updatedAt,
      locales: item.locales,
    })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${pages.map(urlBlocks).join("")}</urlset>`;
}

export function buildRobots(): string {
  // The second language lives under /en or /hr, so every private path is listed with its prefix too.
  const private_ = ["/admin", "/account", "/api", "/img"];
  const prefixes = [
    "",
    ...LOCALES.filter((l) => l !== site.baseLocale).map((l) => `/${l}`),
  ];
  return [
    "User-agent: *",
    ...prefixes.flatMap((prefix) =>
      private_.map((path) => `Disallow: ${prefix}${path}`),
    ),
    "",
    `Sitemap: ${new URL("/sitemap.xml", site.origin).href}`,
    "",
  ].join("\n");
}
