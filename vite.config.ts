import { paraglideVitePlugin } from "@inlang/paraglide-js";
import netlify from "@netlify/vite-plugin-tanstack-start";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { paraglideOptions } from "./src/sites/paraglide-options.ts";
import { parseSiteId } from "./src/sites/site-id.ts";

const siteId = parseSiteId(process.env.VITE_SITE_ID);
process.env.VITE_SITE_ID = siteId;

export default defineConfig(({ command }) => ({
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
}));
