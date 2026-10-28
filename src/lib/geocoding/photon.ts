import { z } from "zod";

import { COUNTRY_BBOX } from "./country-bbox";
import { GeocodeError } from "./errors";
import { getJson, type FetchLike } from "./http";
import { photonPrecision } from "./precision";
import type { GeoHit, Geocoder, IGeoQuery, IReverseQuery } from "./types";

const BASE = "https://photon.komoot.io";

const featureSchema = z.object({
  geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
  properties: z.object({
    type: z.string().optional(),
    osm_key: z.string().optional(),
    osm_value: z.string().optional(),
    name: z.string().optional(),
    street: z.string().optional(),
    housenumber: z.string().optional(),
    postcode: z.string().optional(),
    city: z.string().optional(),
    district: z.string().optional(),
    locality: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    countrycode: z.string().optional(),
  }),
});
const responseSchema = z.object({ features: z.array(featureSchema) });

function labelOf(p: z.infer<typeof featureSchema>["properties"]): string {
  if (p.street) return [p.street, p.housenumber].filter(Boolean).join(" ");
  return p.name ?? p.city ?? "";
}

// expected is the country the form asked for: anything else is a wrong match and is dropped.
export function parsePhoton(body: unknown, expected?: string): GeoHit[] {
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) throw new GeocodeError("unavailable", "bad shape");
  return parsed.data.features.flatMap((feature) => {
    const p = feature.properties;
    const precision = photonPrecision(p);
    const countryCode = p.countrycode?.toUpperCase();
    if (!precision || !countryCode) return [];
    if (expected && countryCode !== expected.toUpperCase()) return [];
    const city = p.city ?? p.locality ?? p.district ?? null;
    return [
      {
        label: labelOf(p),
        secondary: [p.postcode, city, p.state, p.country]
          .filter(Boolean)
          .join(", "),
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
        city,
        countryCode,
        precision,
        source: "photon" as const,
      },
    ];
  });
}

export interface IPhotonOptions {
  fetcher?: FetchLike;
  userAgent: string;
}

export function createPhoton({
  fetcher = fetch,
  userAgent,
}: IPhotonOptions): Geocoder {
  const headers = { "User-Agent": userAgent };

  async function forward({ text, countryCode, limit = 5, signal }: IGeoQuery) {
    const bbox = countryCode
      ? COUNTRY_BBOX[countryCode.toUpperCase()]
      : undefined;
    // Without a country box Photon can return a same-named street in another region (Vukovar test).
    if (!countryCode || !bbox)
      throw new GeocodeError("unavailable", "no country filter for Photon");
    const params = new URLSearchParams({
      q: text,
      limit: String(limit),
      bbox: bbox.join(","),
    });
    for (const layer of ["house", "street", "locality", "district", "city"])
      params.append("layer", layer);
    const body = await getJson(fetcher, `${BASE}/api/?${params}`, {
      headers,
      signal,
    });
    return parsePhoton(body, countryCode);
  }

  return {
    id: "photon",
    covers: (countryCode) =>
      !!countryCode && Object.hasOwn(COUNTRY_BBOX, countryCode.toUpperCase()),
    suggest: forward,
    search: forward,
    async reverse({ lat, lng, signal }: IReverseQuery) {
      const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lng),
        limit: "1",
      });
      const body = await getJson(fetcher, `${BASE}/reverse?${params}`, {
        headers,
        signal,
      });
      return parsePhoton(body)[0] ?? null;
    },
  };
}
