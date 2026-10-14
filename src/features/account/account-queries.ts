import { queryOptions } from "@tanstack/react-query";

import type { IOwnListing } from "./listing-types";
import { getMyListing } from "./account.functions";

export const accountKeys = {
  all: ["account"] as const,
  listing: () => [...accountKeys.all, "listing"] as const,
};

export function myListingQuery() {
  return queryOptions({
    queryKey: accountKeys.listing(),
    queryFn: async () =>
      (await getMyListing()) as unknown as IOwnListing | null,
  });
}
