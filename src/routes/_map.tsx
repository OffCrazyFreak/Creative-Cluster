import {
  createFileRoute,
  retainSearchParams,
  stripSearchParams,
} from "@tanstack/react-router";

import MapFrame from "@/features/map/components/map-frame";
import {
  MAP_SEARCH_DEFAULTS,
  mapSearchSchema,
} from "@/features/map/map-search";

export const Route = createFileRoute("/_map")({
  validateSearch: mapSearchSchema,
  // Filters survive moving between the list, an entry and the board. Strip must come first:
  // it runs last on the way out, after retain has re-added the validated defaults.
  search: {
    middlewares: [
      stripSearchParams(MAP_SEARCH_DEFAULTS),
      retainSearchParams(true),
    ],
  },
  component: MapFrame,
});
