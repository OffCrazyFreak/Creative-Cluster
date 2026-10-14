import { queryOptions } from "@tanstack/react-query";

import { getAdminEntryFn, getOwnListingStatusFn } from "./lifecycle.functions";

export function adminEntryQueryOptions(id: string) {
  return queryOptions({
    queryKey: ["admin", "entry", id],
    queryFn: () => getAdminEntryFn({ data: { id } }),
  });
}

export const OWN_LISTING_KEY = ["account", "listing-status"] as const;

export function ownListingStatusQueryOptions() {
  return queryOptions({
    queryKey: OWN_LISTING_KEY,
    queryFn: () => getOwnListingStatusFn(),
  });
}
