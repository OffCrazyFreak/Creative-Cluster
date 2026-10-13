import { queryOptions } from "@tanstack/react-query";

import {
  getDirectoryFacets,
  getPublishedDirectory,
} from "./directory.functions";

// The published directory is public and identical for everyone, so it is cached for the whole visit.
export function publishedDirectoryQueryOptions() {
  return queryOptions({
    queryKey: ["directory", "published"],
    queryFn: () => getPublishedDirectory(),
    staleTime: 5 * 60_000,
  });
}

export function directoryFacetsQueryOptions() {
  return queryOptions({
    queryKey: ["directory", "facets"],
    queryFn: () => getDirectoryFacets(),
    staleTime: 5 * 60_000,
  });
}
