import { useMemo, useState } from "react";

import type { IMapDirectory } from "@/features/directory/directory-schemas";

import { createSearchIndex, searchSlugs } from "../directory-search";
import { filterEntries } from "../map-filters";
import { toFilters, type MapSearch } from "../map-search";

interface IUseMapResultsInput {
  directory: IMapDirectory | undefined;
  search: MapSearch;
  seed: number;
}

// All filtering happens in the browser on the published directory.
export function useMapResults({
  directory,
  search,
  seed,
}: IUseMapResultsInput) {
  // Filters depend on the filter fields only: the viewport param `v` changes on every pan.
  const { q, tags, country, legal, near, radius } = search;
  const filters = useMemo(
    () => toFilters({ q, tags, country, legal, near, radius, v: "" }),
    [q, tags, country, legal, near, radius],
  );
  // The text index is built when the first query is typed, not on every page load.
  const [needsIndex, setNeedsIndex] = useState(false);
  if (filters.q && !needsIndex) setNeedsIndex(true);
  const index = useMemo(
    () => (directory && needsIndex ? createSearchIndex(directory) : null),
    [directory, needsIndex],
  );

  const pins = useMemo(() => {
    if (!directory) return [];
    return filterEntries({
      entries: directory.entries,
      tags: directory.tags,
      filters,
      textMatches: filters.q && index ? searchSlugs(index, filters.q) : null,
      seed,
    });
  }, [directory, index, filters, seed]);

  return { filters, pins };
}
