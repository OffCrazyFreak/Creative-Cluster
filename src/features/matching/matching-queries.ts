import { queryOptions } from "@tanstack/react-query";

import { getCollaborationCards } from "./matching.functions";

// The answer depends on who reads it (an owner sees "you"), so the viewer is part of the cache key.
export function collaborationQuery(entryId: string, viewerId: string | null) {
  return queryOptions({
    queryKey: ["matching", "collaboration", entryId, viewerId],
    queryFn: () => getCollaborationCards({ data: { entryId } }),
    staleTime: 5 * 60_000,
  });
}
