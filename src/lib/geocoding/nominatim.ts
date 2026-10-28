import { z } from "zod";

import { GeocodeError } from "./errors";
import { getJson, type FetchLike } from "./http";
import { nominatimPrecision } from "./precision";
import type { GeoHit, Geocoder, IGeoQuery, IReverseQuery } from "./types";

const BASE = "https://nominatim.openstreetmap.org";

const itemSchema = z.object({
  lat: z.string(),
  lon: z.string(),
  place_rank: z.number(),
  name: z.string().optional(),
  display_name: z.string(),
  address: z
    .object({
      house_number: z.string().optional(),
      road: z.string().optional(),
      city: z.string().optional(),
      town: z.string().optional(),
      village: z.string().optional(),
      municipality: z.string().optional(),
      country_code: z.string().optional(),
    })
    .default({}),
});

export function parseNominatim(body: unknown): GeoHit[] {
  const parsed = z.array(itemSchema).safeParse(body);
  if (!parsed.success) throw new GeocodeError("unavailable", "bad shape");
  return parsed.data.flatMap((item) => {
    const precision = nominatimPrecision(item.place_rank);
    const a = item.address;
    if (!precision || !a.country_code) return [];
    const city = a.city ?? a.town ?? a.village ?? a.municipality ?? null;
    const street = a.road
      ? [a.road, a.house_number].filter(Boolean).join(" ")
      : "";
    const [first = "", ...rest] = item.display_name.split(", ");
    return [
      {
        label: street || item.name || first,
        secondary: street ? [city].filter(Boolean).join(", ") : rest.join(", "),
        lat: Number(item.lat),
        lng: Number(item.lon),
        city,
        countryCode: a.country_code.toUpperCase(),
        precision,
        source: "nominatim" as const,
      },
    ];
  });
}

export interface INominatimOptions {
  fetcher?: FetchLike;
  userAgent: string;
  // Waits for the global one-per-second slot; throws busy if it cannot get one.
  acquire: () => Promise<void>;
}

// No suggest: the usage policy forbids autocomplete. Search on submit only.
export function createNominatim({
  fetcher = fetch,
  userAgent,
  acquire,
}: INominatimOptions): Geocoder {
  const headers = { "User-Agent": userAgent };

  return {
    id: "nominatim",
    async search({ text, countryCode, limit = 5, signal }: IGeoQuery) {
      await acquire();
      const params = new URLSearchParams({
        q: text,
        format: "jsonv2",
        addressdetails: "1",
        limit: String(limit),
      });
      if (countryCode) params.set("countrycodes", countryCode.toLowerCase());
      return parseNominatim(
        await getJson(fetcher, `${BASE}/search?${params}`, { headers, signal }),
      );
    },
    async reverse({ lat, lng, signal }: IReverseQuery) {
      await acquire();
      const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lng),
        format: "jsonv2",
        addressdetails: "1",
      });
      const body = await getJson(fetcher, `${BASE}/reverse?${params}`, {
        headers,
        signal,
      });
      if (body && typeof body === "object" && "error" in body) return null;
      return parseNominatim([body])[0] ?? null;
    },
  };
}
