import { z } from "zod";

import {
  OPPORTUNITY_CATEGORIES,
  OPPORTUNITY_TYPES,
} from "@/constants/opportunities";

// `tags` and `country` live in the map frame's own search params, so the board and the map pins share them.
export const opportunitySearchSchema = z.object({
  type: z.enum(OPPORTUNITY_TYPES).optional().catch(undefined),
  category: z.enum(OPPORTUNITY_CATEGORIES).optional().catch(undefined),
  closing: z.boolean().optional().catch(undefined),
});
export type OpportunitySearch = z.infer<typeof opportunitySearchSchema>;

export function hasOpportunityFilters(
  search: OpportunitySearch & { tags: string; country: string },
) {
  return Boolean(
    search.type ||
    search.category ||
    search.closing ||
    search.tags ||
    search.country,
  );
}
