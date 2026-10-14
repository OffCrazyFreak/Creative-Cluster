import type { AppLocale } from "@/constants/locales";

import type { PublicOpportunitiesInput } from "./opportunity-list-schemas";
import type { OpportunitySearch } from "./opportunity-search";

const MAX_TAGS = 10;
const MAX_TAG_SLUG = 80;

export function boardInput(
  search: OpportunitySearch & { tags: string; country: string },
  locale: AppLocale,
): PublicOpportunitiesInput {
  return {
    locale,
    type: search.type,
    category: search.category,
    // A shared URL can carry anything: keep to what the server schema accepts instead of failing the page.
    tags: search.tags
      .split(",")
      .filter((slug) => slug.length > 0 && slug.length <= MAX_TAG_SLUG)
      .slice(0, MAX_TAGS),
    country: /^[a-zA-Z]{2}$/.test(search.country)
      ? search.country.toUpperCase()
      : undefined,
    closing: Boolean(search.closing),
  };
}
