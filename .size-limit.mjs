// Bundle budget for CI (`pnpm size`, run after `pnpm build:<site>`).
//
// Each page is the gzip size of the JavaScript its route loads up front: the chunks the
// server preloads for the route chain plus their static imports (dynamic import() calls
// are lazy and not counted). Sizes are size-limit kB (1 kB = 1000 bytes).
//
// Spec section 17.10 targets 170 kB for pages without the map. The limits below are the
// measured sizes plus about 2 percent, so CI passes today and catches regressions. The
// shared floor (the root route: React, router, zod, Base UI, i18n runtime) is about
// 240 kB on its own, so the gap to the target is about 75 kB (directory) up to 335 kB (entry page). Lower a limit
// when a change shrinks a page; raise one only with the reason in the pull request.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

const clientDir = "dist/client";

// TanStack Start lists, per route, the chunks the server preloads for it. A page loads
// the root route plus every route on its match chain. The map library is an idle-time
// dynamic import and is deliberately not part of these lists (its own budget is below).
const manifestFile = readdirSync("dist/server/assets").find((name) =>
  name.startsWith("_tanstack-start-manifest_v-"),
);
if (!manifestFile)
  throw new Error("Run a production build first (pnpm build:rpcc)");
const source = readFileSync(join("dist/server/assets", manifestFile), "utf8");
const { tsrStartManifest } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
const { routes } = tsrStartManifest();

// The preload list leaves out chunks that are also dynamic-import targets, so each file's
// static imports are followed too. Dynamic import() calls are not followed: they are lazy.
const STATIC_IMPORT = /(?:from|import)\s*["']\.\/([^"']+\.js)["']/g;

function pageFiles(...chain) {
  const files = new Set(
    ["__root__", ...chain].flatMap((id) => {
      if (!routes[id])
        throw new Error(`Unknown route ${id} in .size-limit.mjs`);
      return (routes[id].preloads ?? []).map((url) => url.replace(/^\//, ""));
    }),
  );
  for (const file of files) {
    const code = readFileSync(join(clientDir, file), "utf8");
    for (const [, dep] of code.matchAll(STATIC_IMPORT))
      files.add(join(dirname(file), dep));
  }
  return [...files].map((file) => join(clientDir, file));
}

// [name, route chain, limit in kB]
const pages = [
  ["Map home /", ["/_map", "/_map/"], 273],
  ["Directory /directory", ["/directory/"], 252],
  ["Entry /e/:slug", ["/_map", "/_map/e/$slug"], 517],
  ["Opportunities /opportunities", ["/_map", "/_map/opportunities/"], 306],
  ["Legal /about", ["/about"], 296],
  ["Login /login", ["/login"], 303],
  ["Apply /apply", ["/apply/"], 460],
];

export default [
  ...pages.map(([name, chain, limitKb]) => ({
    name,
    path: pageFiles(...chain),
    gzip: true,
    limit: `${limitKb} kB`,
  })),
  // Spec: about 430 kB gzip, loaded on idle on map routes only.
  {
    name: "Map library chunks (idle, map routes only)",
    path: [join(clientDir, "assets/maplibre-gl-*.js")],
    gzip: true,
    limit: "445 kB",
  },
];
