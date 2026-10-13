import { dnz } from "./dnz.ts";
import { rpcc } from "./rpcc.ts";
import type { ISiteConfig } from "./site-config-types.ts";

// Vite inlines VITE_SITE_ID so the other site's config is tree-shaken out;
// Node scripts (tsx) have no import.meta.env and read process.env instead.
const siteId =
  typeof import.meta.env === "undefined"
    ? process.env.VITE_SITE_ID
    : import.meta.env.VITE_SITE_ID;

export const site: ISiteConfig = siteId === "dnz" ? dnz : rpcc;
