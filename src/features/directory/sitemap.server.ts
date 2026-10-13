import { LOCALES } from "@/constants/locales";
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
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Each language variant is its own <url> with the full reciprocal alternate set.
function urlBlocks({ path, lastmod }: ISitemapPage) {
  const alternates = [
    ...LOCALES.map(
      (locale) =>
        `<xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(absoluteUrl(path, locale))}"/>`,
    ),
    `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(absoluteUrl(path, site.baseLocale))}"/>`,
  ].join("");
  return LOCALES.map(
    (locale) =>
      `<url><loc>${escapeXml(absoluteUrl(path, locale))}</loc>${
        lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : ""
      }${alternates}</url>`,
  ).join("");
}

// Only public, indexable pages: never account, admin or filtered URLs.
export async function buildSitemap(): Promise<string> {
  const [entries, facets] = await Promise.all([
    listSitemapEntries(),
    listDirectoryFacets(),
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
  ];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${pages.map(urlBlocks).join("")}</urlset>`;
}

export function buildRobots(): string {
  return [
    "User-agent: *",
    "Disallow: /admin",
    "Disallow: /account",
    "Disallow: /api",
    "Disallow: /img",
    "",
    `Sitemap: ${new URL("/sitemap.xml", site.origin).href}`,
    "",
  ].join("\n");
}
