import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, loadEnv } from "vite";

import { paraglideOptions } from "./src/sites/paraglide-options.ts";
import { parseSiteId } from "./src/sites/site-id.ts";

// Production builds must name their site (both Netlify sites share one build command)
// and a real Turnstile key (the client falls back to the always-pass test key).
function resolveSiteId(command: string, mode: string) {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  // Cloudflare's test site keys start with 1x, 2x or 3x and must never reach a Netlify build.
  if (
    process.env.NETLIFY === "true" &&
    /^[123]x0+/.test(env.VITE_TURNSTILE_SITE_KEY ?? "")
  ) {
    throw new Error("VITE_TURNSTILE_SITE_KEY is a Cloudflare test key");
  }
  if (command === "build" && mode === "production") {
    for (const key of ["VITE_SITE_ID", "VITE_TURNSTILE_SITE_KEY"]) {
      if (!env[key])
        throw new Error(`${key} is required for a production build`);
    }
  }
  return parseSiteId(env.VITE_SITE_ID);
}

export default defineConfig(({ command, mode }) => {
  const siteId = resolveSiteId(command, mode);
  process.env.VITE_SITE_ID = siteId;

  return {
    resolve: { tsconfigPaths: true },
    plugins: [
      paraglideVitePlugin(
        paraglideOptions(siteId, command === "build" && mode === "production"),
      ),
      tailwindcss(),
      tanstackStart({
        importProtection: {
          client: {
            specifiers: ["pg", "@neondatabase/serverless", /^drizzle-orm/],
            files: ["**/*.server.*", "**/src/db/**"],
          },
        },
      }),
      // Netlify's local emulation (edge functions on Deno, a local database) is not needed for dev.
      command === "build" && netlify(),
      viteReact(),
      // `pnpm analyze` only: a treemap of the client bundle (gzip sizes) at dist/stats.html.
      process.env.ANALYZE === "true"
        ? {
            ...visualizer({
              filename: "dist/stats.html",
              gzipSize: true,
              template: "treemap",
            }),
            applyToEnvironment: (environment) => environment.name === "client",
          }
        : null,
      // Uploads source maps only when the token exists; SENTRY_ORG and SENTRY_PROJECT come from the environment. Must stay last.
      command === "build" && Boolean(process.env.SENTRY_AUTH_TOKEN)
        ? sentryTanstackStart({
            authToken: process.env.SENTRY_AUTH_TOKEN,
            // The auto-instrumentation rewrites start.ts and the server functions with static Sentry imports, which pull the browser SDK into the initial bundle.
            autoInstrumentMiddleware: false,
          })
        : null,
    ],
  };
});
