import type {
  IDirectoryEntry,
  IDirectoryTag,
} from "@/features/directory/directory-schemas";

import { distanceKm } from "./geo";
import type { IMapFilters } from "./map-search";
import { seededShuffle } from "./shuffle";

interface IFilterInput {
  entries: IDirectoryEntry[];
  tags: IDirectoryTag[];
  filters: IMapFilters;
  // Slugs ranked by text search, or null when there is no query.
  textMatches: string[] | null;
  seed: number;
}

// Several selected tags widen the result (any of them), like the chips on a map app.
export function filterEntries({
  entries,
  tags,
  filters,
  textMatches,
  seed,
}: IFilterInput): IDirectoryEntry[] {
  const selected = new Set(filters.tags);
  const matched = textMatches ? new Set(textMatches) : null;
  const kept = entries.filter((entry) => {
    if (matched && !matched.has(entry.slug)) return false;
    if (filters.country && entry.country !== filters.country) return false;
    if (filters.legal && entry.legal !== filters.legal) return false;
    if (
      selected.size > 0 &&
      !entry.tags.some((i) => selected.has(tags[i].slug))
    )
      return false;
    if (filters.near && filters.radiusKm > 0) {
      if (entry.lat === null || entry.lng === null) return false;
      if (
        distanceKm(filters.near, { lat: entry.lat, lng: entry.lng }) >
        filters.radiusKm
      )
        return false;
    }
    return true;
  });

  if (textMatches) {
    const rank = new Map(textMatches.map((slug, i) => [slug, i]));
    return kept.sort(
      (a, b) => (rank.get(a.slug) ?? 0) - (rank.get(b.slug) ?? 0),
    );
  }
  if (filters.near) {
    const origin = filters.near;
    function away(e: IDirectoryEntry) {
      return e.lat === null || e.lng === null
        ? Infinity
        : distanceKm(origin, { lat: e.lat, lng: e.lng });
    }
    return kept.sort((a, b) => away(a) - away(b));
  }
  return seededShuffle(kept, seed);
}
