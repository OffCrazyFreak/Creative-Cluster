import { normalizeSearch } from "@/utils/normalize-search";

import type { ITown } from "./town-types";

type TownRow = [name: string, lat: number, lng: number, population: number];

export async function loadTowns(
  countryCode: string,
  signal?: AbortSignal,
): Promise<ITown[]> {
  const code = countryCode.toUpperCase();
  const response = await fetch(`/geo/towns-${code}.json`, { signal });
  // Throwing lets TanStack Query retry; an empty list would be cached as the answer.
  if (!response.ok)
    throw new Error(`Town file ${code} answered ${response.status}`);
  const rows = (await response.json()) as TownRow[];
  return rows.map(([name, lat, lng, population]) => ({
    name,
    lat,
    lng,
    population,
    countryCode: code,
  }));
}

const normalizedNames = new WeakMap<ITown[], string[]>();

function namesOf(towns: ITown[]): string[] {
  let names = normalizedNames.get(towns);
  if (!names) {
    names = towns.map((town) => normalizeSearch(town.name));
    normalizedNames.set(towns, names);
  }
  return names;
}

// Rows arrive sorted by population, so ties keep the bigger town first.
export function searchTowns(towns: ITown[], query: string, limit = 8): ITown[] {
  const needle = normalizeSearch(query);
  if (!needle) return [];
  const starts: ITown[] = [];
  const contains: ITown[] = [];
  const names = namesOf(towns);
  for (const [index, town] of towns.entries()) {
    const hay = names[index];
    if (hay.startsWith(needle) || hay.includes(` ${needle}`)) starts.push(town);
    else if (hay.includes(needle)) contains.push(town);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}
