import { localeUrlPatterns } from "./locale-url-patterns.ts";
import type { SiteId } from "./site-id.ts";

// Shared by the Vite plugin and `pnpm generate`, so both compile the same runtime.
export function paraglideOptions(siteId: SiteId) {
  return {
    project: "./project.inlang",
    outdir: "./src/paraglide",
    outputStructure: "message-modules" as const,
    strategy: ["url" as const, "baseLocale" as const],
    urlPatterns: localeUrlPatterns(siteId),
  };
}
