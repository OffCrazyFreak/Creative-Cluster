import { queryOptions } from "@tanstack/react-query";

import type { IOwnListing } from "./listing-types";
import { getMyListing, getMySummary } from "./account.functions";

export const accountKeys = {
  all: ["account"] as const,
  summary: () => [...accountKeys.all, "summary"] as const,
  listing: () => [...accountKeys.all, "listing"] as const,
};

export function myListingQuery() {
  return queryOptions({
    queryKey: accountKeys.listing(),
    queryFn: async () =>
      (await getMyListing()) as unknown as IOwnListing | null,
  });
}

export function mySummaryQuery() {
  return queryOptions({
    queryKey: accountKeys.summary(),
    queryFn: () => getMySummary(),
  });
}
