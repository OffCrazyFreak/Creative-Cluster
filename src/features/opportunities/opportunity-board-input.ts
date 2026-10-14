import type { AppLocale } from "@/constants/locales";

import type { PublicOpportunitiesInput } from "./opportunity-list-schemas";
import type { OpportunitySearch } from "./opportunity-search";

export function boardInput(
  search: OpportunitySearch & { tags: string; country: string },
  locale: AppLocale,
): PublicOpportunitiesInput {
  return {
    locale,
    type: search.type,
    category: search.category,
    tags: search.tags ? search.tags.split(",").filter(Boolean) : [],
    country: /^[a-zA-Z]{2}$/.test(search.country) ? search.country : undefined,
    closing: Boolean(search.closing),
  };
}
