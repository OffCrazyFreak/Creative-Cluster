import { queryOptions } from "@tanstack/react-query";

import { getEntryPage } from "./entry.functions";

// The server redacts per viewer, so the id is in the key; the short stale time stops viewport writes refetching on every pan.
export function entryQueryOptions(slug: string, viewerId: string | null) {
  return queryOptions({
    queryKey: ["entry", slug, viewerId],
    queryFn: () => getEntryPage({ data: { slug } }),
    staleTime: 30_000,
  });
}
