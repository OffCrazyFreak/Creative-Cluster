import { queryOptions } from "@tanstack/react-query";

import { getEntryPage } from "./entry.functions";

// The viewer id is part of the key because the server redacts per viewer: a login or logout
// must never reuse another viewer's copy. The short stale time keeps viewport writes (which
// re-run the route) from refetching the entry on every pan.
export function entryQueryOptions(slug: string, viewerId: string | null) {
  return queryOptions({
    queryKey: ["entry", slug, viewerId],
    queryFn: () => getEntryPage({ data: { slug } }),
    staleTime: 30_000,
  });
}
