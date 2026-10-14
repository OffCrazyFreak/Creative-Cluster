import { queryOptions } from "@tanstack/react-query";

import { getMyOpportunities } from "./opportunity.functions";
import type { IOwnOpportunities } from "./opportunity-types";

export const opportunityKeys = {
  all: ["opportunities"] as const,
  mine: () => [...opportunityKeys.all, "mine"] as const,
};

export function myOpportunitiesQuery() {
  return queryOptions({
    queryKey: opportunityKeys.mine(),
    queryFn: async () =>
      (await getMyOpportunities()) as unknown as IOwnOpportunities,
  });
}
