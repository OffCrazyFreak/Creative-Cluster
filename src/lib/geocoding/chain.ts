import { asGeocodeError } from "./errors";
import type { GeoHit, Geocoder, IGeoQuery, IReverseQuery } from "./types";

export interface IChainResult<T> {
  value: T;
  // True when the value is empty and at least one adapter failed: "unknown", not "none".
  degraded: boolean;
}

function applicable(geocoders: Geocoder[], countryCode: string | undefined) {
  return geocoders.filter((g) => g.covers?.(countryCode) ?? true);
}

// Falls through on every error except bad_request (our input is wrong, retrying elsewhere is pointless)
// and on empty answers, so Geoapify can cover addresses the Croatian table does not hold.
async function walk<T>(
  geocoders: Geocoder[],
  attempt: (g: Geocoder) => Promise<T> | undefined,
  isEmpty: (value: T) => boolean,
  empty: T,
): Promise<IChainResult<T>> {
  let failures = 0;
  for (const geocoder of geocoders) {
    try {
      const pending = attempt(geocoder);
      if (!pending) continue;
      const value = await pending;
      if (!isEmpty(value)) return { value, degraded: false };
    } catch (error) {
      const failure = asGeocodeError(error);
      if (failure.code === "bad_request") throw failure;
      failures += 1;
    }
  }
  // A provider that failed may have held the answer, so an empty result is not trustworthy (and not cached).
  return { value: empty, degraded: failures > 0 };
}

export function suggestChain(geocoders: Geocoder[], query: IGeoQuery) {
  return walk<GeoHit[]>(
    applicable(geocoders, query.countryCode),
    (g) => g.suggest?.(query),
    (hits) => hits.length === 0,
    [],
  );
}

export function searchChain(geocoders: Geocoder[], query: IGeoQuery) {
  return walk<GeoHit[]>(
    applicable(geocoders, query.countryCode),
    (g) => g.search(query),
    (hits) => hits.length === 0,
    [],
  );
}

export function reverseChain(geocoders: Geocoder[], query: IReverseQuery) {
  return walk<GeoHit | null>(
    geocoders,
    (g) => g.reverse(query),
    (hit) => hit === null,
    null,
  );
}
