import { paraglideVitePlugin } from "@inlang/paraglide-js";
import netlify from "@netlify/vite-plugin-tanstack-start";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

import { paraglideOptions } from "./src/sites/paraglide-options.ts";
import { parseSiteId } from "./src/sites/site-id.ts";

// Production builds must name their site (both Netlify sites share one build command)
// and a real Turnstile key (the client falls back to the always-pass test key).
function resolveSiteId(command: string, mode: string) {
  const env = loadEnv(mode, process.cwd(), "VITE_");
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
      paraglideVitePlugin(paraglideOptions(siteId)),
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
    ],
  };
});
