import { createFileRoute } from "@tanstack/react-router";

import OpportunitiesBoard from "@/features/opportunities/components/opportunities-board";
import { boardInput } from "@/features/opportunities/opportunity-board-input";
import { publicOpportunitiesQuery } from "@/features/opportunities/opportunity-queries";
import {
  hasOpportunityFilters,
  opportunitySearchSchema,
} from "@/features/opportunities/opportunity-search";
import { hasActiveFilters } from "@/features/map/map-search";
import { pageHead } from "@/lib/seo/page-head";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { site } from "@/sites";
import { canonicalLink } from "@/utils/seo-links";

export const Route = createFileRoute("/_map/opportunities/")({
  validateSearch: opportunitySearchSchema,
  loaderDeps: ({ search }) => ({
    type: search.type,
    category: search.category,
    closing: search.closing,
    tags: search.tags,
    country: search.country,
  }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      publicOpportunitiesQuery(
        boardInput(
          { ...deps, tags: deps.tags, country: deps.country },
          getLocale(),
        ),
      ),
    ),
  head: ({ match }) => {
    // Filtered and viewport variants of the board are duplicates: noindex, links still count.
    const variant =
      hasOpportunityFilters(match.search) ||
      hasActiveFilters(match.search) ||
      Boolean(match.search.v);
    const head = pageHead({
      path: "/opportunities",
      title: m.opportunities_board_title(),
      description: m.opportunities_board_meta_description({ site: site.name }),
      noindex: variant,
    });
    return variant
      ? { ...head, links: [canonicalLink("/opportunities")] }
      : head;
  },
  component: OpportunitiesBoard,
});
