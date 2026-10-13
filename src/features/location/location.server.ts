import { db } from "@/db/client.server";
import { env } from "@/env.server";
import { createBreaker, withBreaker } from "@/lib/geocoding/breaker";
import { reverseChain, searchChain, suggestChain } from "@/lib/geocoding/chain";
import { createDgu } from "@/lib/geocoding/dgu/dgu.server";
import { GeocodeError } from "@/lib/geocoding/errors";
import { createGeoapify } from "@/lib/geocoding/geoapify";
import { createNominatim } from "@/lib/geocoding/nominatim";
import { createPhoton } from "@/lib/geocoding/photon";
import {
  cacheKey,
  readCache,
  reverseKey,
  writeCache,
} from "@/lib/geocoding/cache.server";
import type { GeoHit, Geocoder } from "@/lib/geocoding/types";
import { enforceLimits, hitLimit } from "@/lib/limits/check-limit.server";

import type { SuggestInput } from "./location-schemas";

const GEOAPIFY_DAILY_BUDGET = 2500;
const LIMITS = {
  suggest: { max: 30, windowSeconds: 60 },
  search: { max: 5, windowSeconds: 60 },
  reverse: { max: 20, windowSeconds: 60 },
};

export interface IGeocodeOutcome<T> {
  hits: T;
  // True when every provider failed: the form should offer the manual fallback, not "no results".
  degraded: boolean;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The public Nominatim server allows one request a second across the whole app.
async function acquireNominatim() {
  const slot = { key: "nominatim:global", max: 1, windowSeconds: 1 };
  if (await hitLimit(slot)) return;
  await sleep(1100);
  if (!(await hitLimit(slot))) throw new GeocodeError("rate_limited");
}

async function spendGeoapify() {
  const day = {
    key: "geoapify:day",
    max: GEOAPIFY_DAILY_BUDGET,
    windowSeconds: 86_400,
  };
  if (!(await hitLimit(day)))
    throw new GeocodeError("rate_limited", "daily budget");
}

let chain: Geocoder[] | undefined;

function geocoders(): Geocoder[] {
  if (chain) return chain;
  const userAgent = `CreativeCluster/1.0 (${env.GEOCODER_CONTACT})`;
  const list: Geocoder[] = [createDgu(db)];
  if (env.GEOAPIFY_API_KEY)
    list.push(
      createGeoapify({ apiKey: env.GEOAPIFY_API_KEY, spend: spendGeoapify }),
    );
  list.push(
    createPhoton({ userAgent }),
    createNominatim({ userAgent, acquire: acquireNominatim }),
  );
  chain = list.map((g) =>
    g.id === "dgu" ? g : withBreaker(g, createBreaker()),
  );
  return chain;
}

// DGU answers come from our own table, so only provider results are worth caching.
function cacheable(hits: GeoHit[]) {
  return hits.every((hit) => hit.source !== "dgu");
}

async function cachedList(
  op: "suggest" | "search",
  input: SuggestInput,
  run: () => ReturnType<typeof suggestChain>,
): Promise<IGeocodeOutcome<GeoHit[]>> {
  const key = cacheKey(op, input.countryCode, input.text);
  const cached = await readCache(db, key);
  if (cached) return { hits: cached, degraded: false };
  const { value, degraded } = await run();
  if (!degraded && cacheable(value))
    await writeCache(db, key, value[0]?.source ?? "none", value);
  return { hits: value, degraded };
}

export async function suggestAddresses(userKey: string, input: SuggestInput) {
  await enforceLimits([{ key: `geo:suggest:${userKey}`, ...LIMITS.suggest }]);
  return cachedList("suggest", input, () =>
    suggestChain(geocoders(), { ...input, limit: 5 }),
  );
}

export async function searchAddresses(userKey: string, input: SuggestInput) {
  await enforceLimits([{ key: `geo:search:${userKey}`, ...LIMITS.search }]);
  return cachedList("search", input, () =>
    searchChain(geocoders(), { ...input, limit: 5 }),
  );
}

export async function reversePoint(userKey: string, lat: number, lng: number) {
  await enforceLimits([{ key: `geo:reverse:${userKey}`, ...LIMITS.reverse }]);
  const key = reverseKey(lat, lng);
  const cached = await readCache(db, key);
  if (cached) return { hit: cached[0] ?? null, degraded: false };
  const { value, degraded } = await reverseChain(geocoders(), { lat, lng });
  if (!degraded)
    await writeCache(db, key, value?.source ?? "none", value ? [value] : []);
  return { hit: value, degraded };
}

export async function dguImportInfo(): Promise<{
  downloadedAt: string;
} | null> {
  const hits = await readCache(db, "meta:dgu");
  const row = hits?.[0] as unknown as { downloadedAt?: string } | undefined;
  return row?.downloadedAt ? { downloadedAt: row.downloadedAt } : null;
}
