import { queryOptions } from "@tanstack/react-query";

import {
  getDirectoryFacets,
  getPublishedDirectory,
} from "./directory.functions";
import type { IMapDirectory } from "./directory-schemas";

async function fetchPublishedDirectory(): Promise<IMapDirectory> {
  // During SSR the loader reads it in-process; the browser uses the cacheable public route.
  if (typeof window === "undefined") return getPublishedDirectory();
  const response = await fetch("/directory.json", { credentials: "omit" });
  if (!response.ok) throw new Error("Directory request failed");
  return (await response.json()) as IMapDirectory;
}

// Short stale time plus refetch on focus: removals reach an open tab within about a minute.
export function publishedDirectoryQueryOptions() {
  return queryOptions({
    queryKey: ["directory", "published"],
    queryFn: fetchPublishedDirectory,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function directoryFacetsQueryOptions() {
  return queryOptions({
    queryKey: ["directory", "facets"],
    queryFn: () => getDirectoryFacets(),
    staleTime: 5 * 60_000,
  });
}
