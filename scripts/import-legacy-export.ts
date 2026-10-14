import "./load-env";

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";

import { z } from "zod";

import { LEGACY_SOURCE_LABEL, STAGING_VERSION } from "../src/constants/import";
import {
  stagingFileSchema,
  type StagingOrganization,
} from "../src/features/import/import-schemas";
import {
  legacyOrganizationSchema,
  mapLegacyOrganization,
} from "../src/features/import/legacy-map";
import { parseSiteId } from "../src/sites/site-id";

const { values } = parseArgs({
  options: {
    "from-api": { type: "string" },
    ref: { type: "string", default: "origin/legacy" },
    out: { type: "string" },
    geocode: { type: "boolean", default: false },
    country: { type: "string" },
  },
});

const siteId = parseSiteId(process.env.VITE_SITE_ID);
const out = values.out ?? `data/import/${siteId}-staging.json`;
const legacyFile = "Frontend/src/data/organizations.json";

// The old Spring controller serves GET /api/organizations without authentication; nothing is called unless --from-api is given.
async function readFromApi(base: string): Promise<unknown> {
  const url = new URL("/api/organizations", base);
  const response = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!response.ok)
    throw new Error(`${url.origin} answered ${response.status}`);
  return response.json();
}

function readFromGit(ref: string): unknown {
  const raw = execFileSync("git", ["show", `${ref}:${legacyFile}`], {
    encoding: "utf8",
    maxBuffer: 20_000_000,
  });
  return JSON.parse(raw);
}

const rawRows = values["from-api"]
  ? await readFromApi(values["from-api"])
  : readFromGit(values.ref ?? "origin/legacy");
const rows = z.array(legacyOrganizationSchema).parse(rawRows);
let organizations: StagingOrganization[] = rows.map(mapLegacyOrganization);

let geocoded = 0;
if (values.geocode) {
  const { geocodeOrganization } =
    await import("../src/features/import/geocode-staging.server");
  organizations = await Promise.all(
    organizations.map(async (org) => {
      const result = await geocodeOrganization(
        org,
        values.country?.toUpperCase() ?? null,
      ).catch(() => ({
        org,
        found: false,
      }));
      if (result.found) geocoded += 1;
      return result.org;
    }),
  );
}

const file = stagingFileSchema.parse({
  version: STAGING_VERSION,
  site: siteId,
  source: values["from-api"]
    ? `${LEGACY_SOURCE_LABEL}:api`
    : `${LEGACY_SOURCE_LABEL}:${values.ref}`,
  exportedAt: new Date().toISOString(),
  organizations,
});

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(file, null, 2)}\n`);

function count(test: (org: StagingOrganization) => boolean) {
  return organizations.filter(test).length;
}
console.log(`Wrote ${organizations.length} organizations to ${out}`);
console.log(`  with contact email: ${count((o) => o.contactEmail !== "")}`);
console.log(`  with website: ${count((o) => o.website !== "")}`);
console.log(`  with references: ${count((o) => o.references !== "")}`);
console.log(`  with a pin: ${count((o) => o.location.lat !== null)}`);
if (values.geocode) console.log(`  geocoded now: ${geocoded}`);
console.log(
  "The file holds real contact data: keep it out of git (data/ is ignored).",
);
