import "./load-env";

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { parseArgs } from "node:util";

import { z } from "zod";

import { LEGACY_SOURCE_LABEL, STAGING_VERSION } from "../src/constants/import";
import {
  stagingFileSchema,
  stagingOrganizationSchema,
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
// The file holds real contact data and the repository is public: only the ignored folder is allowed.
const allowedDir = resolve("data", "import");
if (!resolve(out).startsWith(`${allowedDir}${sep}`)) {
  console.error("--out must be a path inside data/import (it is git-ignored).");
  process.exit(1);
}
const defaultCountry = values.country?.toUpperCase() ?? null;
if (defaultCountry && !/^[A-Z]{2}$/.test(defaultCountry)) {
  console.error("--country must be a two-letter code such as HR.");
  process.exit(1);
}
const legacyFile = "Frontend/src/data/organizations.json";

// The old Spring controller serves GET /api/organizations without authentication; nothing is called unless --from-api is given.
async function readFromApi(base: string): Promise<unknown> {
  // Relative on purpose: a context path on the old server must survive.
  const url = new URL(
    "api/organizations",
    base.endsWith("/") ? base : `${base}/`,
  );
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
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
const skipped: string[] = [];
let organizations: StagingOrganization[] = [];
const seenIds = new Set<string>();
for (const row of rows) {
  const mapped = mapLegacyOrganization(row);
  const checked = stagingOrganizationSchema.safeParse(mapped);
  // Paths only, never values: the rows hold contact data.
  if (!checked.success)
    skipped.push(
      `id ${mapped.legacyId}: ${checked.error.issues.map((i) => i.path.join(".")).join(", ")}`,
    );
  else if (seenIds.has(mapped.legacyId))
    skipped.push(`id ${mapped.legacyId}: duplicate id`);
  else {
    seenIds.add(mapped.legacyId);
    organizations.push(checked.data);
  }
}

const geocodeCounts = { found: 0, miss: 0, skipped: 0, failed: 0 };
if (values.geocode) {
  const { geocodeOrganization } =
    await import("../src/features/import/geocode-staging.server");
  // Sequential: the public providers allow about one request a second.
  const done: StagingOrganization[] = [];
  for (const org of organizations) {
    const result = await geocodeOrganization(org, defaultCountry).catch(() => ({
      org,
      outcome: "failed" as const,
    }));
    geocodeCounts[result.outcome] += 1;
    done.push(result.org);
  }
  organizations = done;
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
if (values.geocode)
  console.log(
    `  geocoding: ${geocodeCounts.found} found, ${geocodeCounts.miss} no match, ${geocodeCounts.skipped} skipped (no country or address), ${geocodeCounts.failed} failed`,
  );
if (skipped.length > 0) {
  console.log(
    `Left out ${skipped.length} rows that do not fit the staging format:`,
  );
  for (const line of skipped) console.log(`  ${line}`);
}
console.log(
  "The file holds real contact data: keep it out of git (data/import is ignored).",
);
process.exit(0);
