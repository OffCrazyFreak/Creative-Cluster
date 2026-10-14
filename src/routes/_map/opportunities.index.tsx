import { createFileRoute } from "@tanstack/react-router";

import OpportunitiesBoard from "@/features/opportunities/components/opportunities-board";
import { boardInput } from "@/features/opportunities/opportunity-board-input";
import { publicOpportunitiesQuery } from "@/features/opportunities/opportunity-queries";
import {
  hasOpportunityFilters,
  opportunitySearchSchema,
} from "@/features/opportunities/opportunity-search";
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
    const head = pageHead({
      path: "/opportunities",
      title: m.opportunities_board_title(),
      description: m.opportunities_board_meta_description({ site: site.name }),
    });
    // Filtered variants are duplicates of the board: noindex, links still count.
    if (!hasOpportunityFilters(match.search)) return head;
    return {
      meta: [...head.meta, { name: "robots", content: "noindex, follow" }],
      links: [canonicalLink("/opportunities")],
    };
  },
  component: OpportunitiesBoard,
});
