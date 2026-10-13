import { z } from "zod";

import { GeocodeError } from "./errors";
import { getJson, type FetchLike } from "./http";
import { geoapifyPrecision } from "./precision";
import type { GeoHit, Geocoder, IGeoQuery, IReverseQuery } from "./types";

const BASE = "https://api-eu.geoapify.com/v1/geocode";

const resultSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  formatted: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  town: z.string().optional(),
  village: z.string().optional(),
  country_code: z.string(),
  housenumber: z.string().optional(),
  result_type: z.string().optional(),
  rank: z
    .object({
      confidence_building_level: z.number().optional(),
      match_type: z.string().optional(),
    })
    .optional(),
});
const responseSchema = z.object({ results: z.array(resultSchema).default([]) });

export function parseGeoapify(body: unknown): GeoHit[] {
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) throw new GeocodeError("unavailable", "bad shape");
  return parsed.data.results.flatMap((item) => {
    const precision = geoapifyPrecision(item);
    if (!precision) return [];
    return [
      {
        label: item.address_line1 ?? item.formatted ?? "",
        secondary: item.address_line2 ?? "",
        lat: item.lat,
        lng: item.lon,
        city: item.city ?? item.town ?? item.village ?? null,
        countryCode: item.country_code.toUpperCase(),
        precision,
        source: "geoapify" as const,
      },
    ];
  });
}

export interface IGeoapifyOptions {
  apiKey: string;
  fetcher?: FetchLike;
  // Spends one unit of the daily budget; throws rate_limited when it is gone.
  spend?: () => Promise<void>;
}

// The key stays on our server; "Powered by Geoapify" is shown next to the field.
export function createGeoapify(options: IGeoapifyOptions): Geocoder {
  const fetcher = options.fetcher ?? fetch;

  async function call(
    path: string,
    params: URLSearchParams,
    signal?: AbortSignal,
  ) {
    await options.spend?.();
    params.set("apiKey", options.apiKey);
    params.set("format", "json");
    return getJson(fetcher, `${BASE}/${path}?${params}`, { signal });
  }

  function forward(path: string) {
    return async ({ text, countryCode, limit = 5, signal }: IGeoQuery) => {
      const params = new URLSearchParams({ text, limit: String(limit) });
      if (countryCode)
        params.set("filter", `countrycode:${countryCode.toLowerCase()}`);
      return parseGeoapify(await call(path, params, signal));
    };
  }

  return {
    id: "geoapify",
    suggest: forward("autocomplete"),
    search: forward("search"),
    async reverse({ lat, lng, signal }: IReverseQuery) {
      const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lng),
      });
      return parseGeoapify(await call("reverse", params, signal))[0] ?? null;
    },
  };
}
