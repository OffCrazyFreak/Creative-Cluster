import { queryOptions } from "@tanstack/react-query";

import { getCollaborationCards } from "./matching.functions";

export function collaborationQuery(entryId: string) {
  return queryOptions({
    queryKey: ["matching", "collaboration", entryId],
    queryFn: () => getCollaborationCards({ data: { entryId } }),
    staleTime: 5 * 60_000,
  });
}
