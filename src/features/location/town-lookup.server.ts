import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { env } from "@/env.server";

import type { ITown } from "./town-types";

type TownRow = [name: string, lat: number, lng: number, population: number];

const cache = new Map<string, Promise<ITown[]>>();

async function readRows(code: string): Promise<TownRow[]> {
  const file = `towns-${code}.json`;
  try {
    return JSON.parse(
      await readFile(join(process.cwd(), "public", "geo", file), "utf8"),
    ) as TownRow[];
  } catch {
    // A deployed function has no public folder next to it; the static file is served by the site itself.
    const response = await fetch(`${env.BETTER_AUTH_URL}/geo/${file}`);
    if (!response.ok)
      throw new Error(`Town file ${code} answered ${response.status}`);
    return (await response.json()) as TownRow[];
  }
}

function load(countryCode: string): Promise<ITown[]> {
  const code = countryCode.toUpperCase();
  let towns = cache.get(code);
  if (!towns) {
    towns = readRows(code).then((rows) =>
      rows.map(([name, lat, lng, population]) => ({
        name,
        lat,
        lng,
        population,
        countryCode: code,
      })),
    );
    // A failed load must not be cached as the answer.
    towns.catch(() => cache.delete(code));
    cache.set(code, towns);
  }
  return towns;
}

// The server's copy of the GeoNames list: a person's town must be a real entry, never browser-supplied numbers.
export async function findTown(
  countryCode: string,
  name: string,
  lat: number,
  lng: number,
): Promise<ITown | null> {
  const towns = await load(countryCode);
  return (
    towns.find(
      (town) => town.name === name && town.lat === lat && town.lng === lng,
    ) ?? null
  );
}
