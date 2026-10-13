import { queryOptions } from "@tanstack/react-query";

import { getViewer } from "./session.functions";

export const VIEWER_QUERY_KEY = ["viewer"] as const;

export function viewerQueryOptions() {
  return queryOptions({
    queryKey: VIEWER_QUERY_KEY,
    // A failed session lookup must not take public pages down: treat the visitor as anonymous.
    queryFn: () => getViewer().catch(() => null),
    staleTime: 60_000,
  });
}

export type Viewer = Awaited<ReturnType<typeof getViewer>>;
