import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback } from "react";

import type { MapSearch } from "../map-search";

// Filter changes always land on the results list; on the list itself they replace the history entry.
export function useUpdateMapSearch() {
  const navigate = useNavigate();
  const onIndex = useRouterState({
    select: (state) => state.matches.at(-1)?.routeId === "/_map/",
  });

  return useCallback(
    (patch: Partial<MapSearch>) =>
      navigate({
        to: "/",
        search: (prev) => ({ ...prev, ...patch }),
        replace: onIndex,
      }),
    [navigate, onIndex],
  );
}
