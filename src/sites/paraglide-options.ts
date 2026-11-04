import { localeUrlPatterns } from "./locale-url-patterns.ts";
import type { SiteId } from "./site-id.ts";

// Paraglide recommends one module per message in production and one per locale elsewhere; hundreds of modules made Vitest fail to resolve them.
export function paraglideOptions(siteId: SiteId, production: boolean) {
  return {
    project: "./project.inlang",
    outdir: "./src/paraglide",
    outputStructure: production
      ? ("message-modules" as const)
      : ("locale-modules" as const),
    strategy: ["url" as const, "baseLocale" as const],
    urlPatterns: localeUrlPatterns(siteId),
  };
}
