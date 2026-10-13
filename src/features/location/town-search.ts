import { normalizeSearch } from "@/utils/normalize-search";

import type { ITown } from "./town-types";

type TownRow = [name: string, lat: number, lng: number, population: number];

export async function loadTowns(
  countryCode: string,
  signal?: AbortSignal,
): Promise<ITown[]> {
  const code = countryCode.toUpperCase();
  const response = await fetch(`/geo/towns-${code}.json`, { signal });
  if (!response.ok) return [];
  const rows = (await response.json()) as TownRow[];
  return rows.map(([name, lat, lng, population]) => ({
    name,
    lat,
    lng,
    population,
    countryCode: code,
  }));
}

// Rows arrive sorted by population, so ties keep the bigger town first.
export function searchTowns(towns: ITown[], query: string, limit = 8): ITown[] {
  const needle = normalizeSearch(query);
  if (!needle) return [];
  const starts: ITown[] = [];
  const contains: ITown[] = [];
  for (const town of towns) {
    const hay = normalizeSearch(town.name);
    if (hay.startsWith(needle) || hay.includes(` ${needle}`)) starts.push(town);
    else if (hay.includes(needle)) contains.push(town);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}
