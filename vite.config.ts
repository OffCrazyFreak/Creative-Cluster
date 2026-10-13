import { paraglideVitePlugin } from "@inlang/paraglide-js";
import netlify from "@netlify/vite-plugin-tanstack-start";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

import { paraglideOptions } from "./src/sites/paraglide-options.ts";
import { parseSiteId } from "./src/sites/site-id.ts";

const siteId = parseSiteId(process.env.VITE_SITE_ID);
process.env.VITE_SITE_ID = siteId;

// The client falls back to Cloudflare's always-pass test key, which the production
// secret rejects, so a production build without a real key must fail here instead.
function requireProductionKeys(command: string, mode: string) {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  if (
    command === "build" &&
    mode === "production" &&
    !env.VITE_TURNSTILE_SITE_KEY
  ) {
    throw new Error(
      "VITE_TURNSTILE_SITE_KEY is required for a production build",
    );
  }
}

export default defineConfig(({ command, mode }) => {
  requireProductionKeys(command, mode);

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
