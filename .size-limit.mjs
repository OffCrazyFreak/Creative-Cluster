// Bundle budget for CI (`pnpm size`, run after `pnpm build:<site>`).
//
// Each page is the gzip size of the JavaScript its route loads up front: the chunks the
// server preloads for the route chain plus their static imports (dynamic import() calls
// are lazy and not counted). Sizes are size-limit kB (1 kB = 1000 bytes).
//
// Spec section 17.10 targets 170 kB for pages without the map; the root route alone is
// above that, so these limits are the measured sizes plus about 2 percent: they catch
// regressions, not the gap. Lower a limit when a change shrinks a page; raise one only
// with the reason in the pull request. The build has no Sentry token in CI, so the
// Sentry plugin that production builds add is not measured.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

const clientDir = "dist/client";

// TanStack Start lists, per route, the chunks the server preloads for it. A page loads
// the root route plus every route on its match chain. The map library is an idle-time
// dynamic import and is deliberately not part of these lists (its own budget is below).
const serverAssets = "dist/server/assets";
const manifestFile = existsSync(serverAssets)
  ? readdirSync(serverAssets).find((name) =>
      name.startsWith("_tanstack-start-manifest_v-"),
    )
  : undefined;
if (!manifestFile)
  throw new Error(
    "No TanStack Start route manifest in dist/server/assets: run pnpm build:rpcc or pnpm build:dnz first, and check the plugin did not rename the file",
  );
const source = readFileSync(join(serverAssets, manifestFile), "utf8");
const { tsrStartManifest } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
const { routes } = tsrStartManifest();

// The preload list leaves out chunks that are also dynamic-import targets, so each file's
// static imports are followed too. Dynamic import() calls are not followed: they are lazy.
const STATIC_IMPORT = /(?:from|import)\s*["'](\.{1,2}\/[^"']+\.js)["']/g;

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
  ["Map home /", ["/_map", "/_map/"], 280],
  ["Directory /directory", ["/directory/"], 252],
  ["Entry /e/:slug", ["/_map", "/_map/e/$slug"], 349],
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
  // Fetched right after hydration on entries that have connections.
  {
    name: "Connection graph chunk (entries with connections)",
    path: [join(clientDir, "assets/connection-graph-*.js")],
    gzip: true,
    limit: "58 kB",
  },
  // Spec: about 430 kB gzip, loaded on idle on map routes only.
  {
    name: "Map library chunks (idle, map routes only)",
    path: [join(clientDir, "assets/maplibre-gl-*.js")],
    gzip: true,
    limit: "445 kB",
  },
];
