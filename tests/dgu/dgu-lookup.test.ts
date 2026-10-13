import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";

import * as schema from "../../src/db/schema";
import { lookupDgu } from "../../src/lib/geocoding/dgu/dgu.server";
import { haversineMeters } from "../../src/utils/geo";

// Runs against a database that `pnpm dgu:import` has filled; CI has an empty one, so it skips there.
config({ path: ".env.local", quiet: true });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
const loaded = await pool
  .query("select count(*)::int as n from hr_address")
  .then((r) => (r.rows[0] as { n: number }).n > 1_000_000)
  .catch(() => false);

afterAll(() => pool.end());

// The 12 buildings of the Nominatim/Photon test (verify-round-2) as DGU spells them.
const BUILDINGS: [query: string, street: string][] = [
  ["Trg Republike Hrvatske 15 Zagreb", "Trg Republike Hrvatske"],
  ["Trg sv. Marka 6 Zagreb", "Trg sv. Marka"],
  ["Unska 3 Zagreb", "Unska ulica"],
  ["Rooseveltov trg 5 Zagreb", "Rooseveltov trg"],
  ["Marulićev trg 21 Zagreb", "Trg Marka Marulića"],
  ["Avenija Dubrovnik 17 Zagreb", "Avenija Dubrovnik"],
  ["Pred Dvorom 3 Dubrovnik", "Pred Dvorom"],
  ["Trg Gaje Bulata 1 Split", "Trg G. Bulata"],
  ["Trg Svetog Trojstva 6 Osijek", "Trg sv. Trojstva"],
  ["Strossmayerova 15 Vukovar", "Josipa Jurja Strossmayera"],
  ["Trg Republike 5 Čakovec", "Trg Republike"],
];

describe.skipIf(!loaded)("DGU lookup against the imported table", () => {
  it.each(BUILDINGS)("%s is a house match", async (query, street) => {
    const [hit] = await lookupDgu(db, query, false, 3);
    expect(hit?.precision).toBe("house");
    expect(hit?.label.startsWith(street)).toBe(true);
    expect(hit?.countryCode).toBe("HR");
  });

  it("finds a Zadar street when there is no number (street precision)", async () => {
    const [hit] = await lookupDgu(db, "Narodni trg Zadar", false, 3);
    expect(hit?.precision).toBe("street");
    expect(hit?.secondary).toContain("Zadar");
  });

  it("puts a DGU point for Ilica 69 within 5 m of its OpenStreetMap node", async () => {
    // OSM node 2859633588 (addr:housenumber=69, Ilica, Zagreb); DGU holds several points for this address.
    const osm = { lat: 45.8125555, lng: 15.9652085 };
    const hits = await lookupDgu(db, "Ilica 69 Zagreb", false, 20);
    const nearest = Math.min(...hits.map((h) => haversineMeters(osm, h)));
    expect(nearest).toBeLessThan(5);
  });

  it("offers number prefixes while typing", async () => {
    const hits = await lookupDgu(db, "Ilica 6 Zagreb", true, 10);
    expect(hits.map((h) => h.label)).toContain("Ilica 6");
    expect(hits.length).toBeGreaterThan(1);
  });
});
