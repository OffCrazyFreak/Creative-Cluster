import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback } from "react";

import { track } from "@/lib/analytics/track";

import type { MapSearch } from "../map-search";

const TRACKED_FILTERS = ["q", "tags", "country", "legal", "near"] as const;

// Filter changes always land on the results list; on the list itself they replace the history entry.
export function useUpdateMapSearch() {
  const navigate = useNavigate();
  const onIndex = useRouterState({
    select: (state) => state.matches.at(-1)?.routeId === "/_map/",
  });

  return useCallback(
    (patch: Partial<MapSearch>) => {
      // Only the filter name is sent, never the value, and clearing a filter is not a use.
      for (const filter of TRACKED_FILTERS)
        if (patch[filter]) track("filter_used", { filter });
      return navigate({
        to: "/",
        search: (prev) => ({ ...prev, ...patch }),
        replace: onIndex,
      });
    },
    [navigate, onIndex],
  );
}
