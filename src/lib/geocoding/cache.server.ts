import { eq, sql } from "drizzle-orm";

import type { DbOrTx } from "@/db/client.server";
import { geocodeCache } from "@/db/schema";
import { normalizeSearch } from "@/utils/normalize-search";

import type { GeoHit } from "./types";

export const EMPTY_TTL_DAYS = 7;

export function cacheKey(
  op: string,
  countryCode: string | undefined,
  text: string,
) {
  return `${op}:${(countryCode ?? "").toUpperCase()}:${normalizeSearch(text)}`;
}

export function reverseKey(lat: number, lng: number) {
  return `reverse:${lat.toFixed(4)},${lng.toFixed(4)}`;
}

// Provider results may be stored (Geoapify terms, ODbL) and Nominatim's policy asks for it;
// empty answers expire so a fixed OSM edit or a recovered provider is picked up.
export async function readCache(
  db: DbOrTx,
  key: string,
): Promise<GeoHit[] | null> {
  const [row] = await db
    .select({ hits: geocodeCache.hits, createdAt: geocodeCache.createdAt })
    .from(geocodeCache)
    .where(eq(geocodeCache.key, key));
  if (!row) return null;
  const hits = row.hits as GeoHit[];
  const ageMs = Date.now() - row.createdAt.getTime();
  if (hits.length === 0 && ageMs > EMPTY_TTL_DAYS * 86_400_000) return null;
  return hits;
}

export async function writeCache(
  db: DbOrTx,
  key: string,
  provider: string,
  hits: GeoHit[],
) {
  await db
    .insert(geocodeCache)
    .values({ key, provider, hits })
    .onConflictDoUpdate({
      target: geocodeCache.key,
      set: { provider, hits, createdAt: sql`now()` },
    });
}
