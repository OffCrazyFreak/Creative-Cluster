import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback } from "react";

import { track } from "@/lib/analytics/track";

import type { MapSearch } from "../map-search";

const TRACKED_FILTERS = ["q", "tags", "country", "legal", "near"] as const;

// The search box patches `q` on every typing pause and again on submit; one event per window is enough.
const TRACK_WINDOW_MS = 10_000;
const lastTracked = new Map<string, number>();

function trackFilter(filter: (typeof TRACKED_FILTERS)[number]) {
  const now = Date.now();
  if (now - (lastTracked.get(filter) ?? 0) < TRACK_WINDOW_MS) return;
  lastTracked.set(filter, now);
  track("filter_used", { filter });
}

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
        if (patch[filter]) trackFilter(filter);
      return navigate({
        to: "/",
        search: (prev) => ({ ...prev, ...patch }),
        replace: onIndex,
      });
    },
    [navigate, onIndex],
  );
}
