import type {
  IDirectoryEntry,
  IDirectoryTag,
} from "@/features/directory/directory-schemas";

import { distanceKm } from "./geo";
import type { IMapFilters, IPoint } from "./map-search";
import { seededShuffle } from "./shuffle";

interface IFilterInput {
  entries: IDirectoryEntry[];
  tags: IDirectoryTag[];
  filters: IMapFilters;
  // Slugs ranked by text search, or null when there is no query.
  textMatches: string[] | null;
  seed: number;
  // The visitor's position or IP guess: sorts by distance instead of the seeded order.
  origin?: IPoint | null;
}

// Several selected tags widen the result (any of them), like the chips on a map app.
export function filterEntries({
  entries,
  tags,
  filters,
  textMatches,
  seed,
  origin = null,
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
  // A chosen point wins over the visitor's own position.
  const from = filters.near ?? origin;
  if (from) {
    function away(e: IDirectoryEntry, point: IPoint) {
      return e.lat === null || e.lng === null
        ? Infinity
        : distanceKm(point, { lat: e.lat, lng: e.lng });
    }
    return kept.sort((a, b) => away(a, from) - away(b, from));
  }
  return seededShuffle(kept, seed);
}
