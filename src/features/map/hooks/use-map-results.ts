import { useMemo } from "react";

import type { IMapDirectory } from "@/features/directory/directory-schemas";

import { createSearchIndex, searchSlugs } from "../directory-search";
import type { IBounds } from "../geo";
import { filterEntries, limitToBounds } from "../map-filters";
import { toFilters, type MapSearch } from "../map-search";

interface IUseMapResultsInput {
  directory: IMapDirectory | undefined;
  search: MapSearch;
  seed: number;
  areaBounds: IBounds | null;
  listOverride: string[] | null;
}

// All filtering happens in the browser on the published directory.
export function useMapResults({
  directory,
  search,
  seed,
  areaBounds,
  listOverride,
}: IUseMapResultsInput) {
  const index = useMemo(
    () => (directory ? createSearchIndex(directory) : null),
    [directory],
  );
  const filters = useMemo(() => toFilters(search), [search]);

  const pins = useMemo(() => {
    if (!directory || !index) return [];
    return filterEntries({
      entries: directory.entries,
      tags: directory.tags,
      filters,
      textMatches: filters.q ? searchSlugs(index, filters.q) : null,
      seed,
    });
  }, [directory, index, filters, seed]);

  const listed = useMemo(() => {
    if (listOverride) {
      const wanted = new Set(listOverride);
      return pins.filter((entry) => wanted.has(entry.slug));
    }
    return limitToBounds(pins, areaBounds);
  }, [pins, areaBounds, listOverride]);

  return { filters, pins, listed };
}
