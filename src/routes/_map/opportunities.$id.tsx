import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";

import { goneStatusMiddleware } from "@/features/entry/gone-status-middleware";
import OpportunityDetail from "@/features/opportunities/components/opportunity-detail";
import OpportunityGone from "@/features/opportunities/components/opportunity-gone";
import { opportunityPageQuery } from "@/features/opportunities/opportunity-queries";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { site } from "@/sites";
import { canonicalLink, indexableLinks } from "@/utils/seo-links";

export const Route = createFileRoute("/_map/opportunities/$id")({
  server: { middleware: [goneStatusMiddleware] },
  loader: async ({ params, context }) => {
    // A malformed id is a missing page, not a server error.
    if (!z.uuid().safeParse(params.id).success) throw notFound();
    const result = await context.queryClient.ensureQueryData(
      opportunityPageQuery(params.id, getLocale()),
    );
    if (result.status === "missing") throw notFound();
    return result;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData || loaderData.status !== "found")
      return {
        meta: [{ title: site.name }, { name: "robots", content: "noindex" }],
      };
    const { opportunity } = loaderData;
    const path = `/opportunities/${params.id}`;
    const title = opportunity.translation?.title ?? opportunity.title;
    const description =
      (opportunity.translation?.bodyText ?? opportunity.bodyText).slice(
        0,
        200,
      ) ||
      m.opportunities_detail_meta_fallback({
        title,
        name: opportunity.entry.name,
        site: site.name,
      });
    // Ended pages and pages still in the owner's language stay out of the index. No structured
    // data on purpose: Google's JobPosting is for jobs, and these are not.
    const noindex =
      opportunity.state !== "active" || opportunity.translationMissing;
    return {
      meta: [
        { title: `${title} | ${site.name}` },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        ...(noindex ? [{ name: "robots", content: "noindex, follow" }] : []),
      ],
      links: noindex
        ? [canonicalLink(path)]
        : indexableLinks(path, opportunity.indexedLocales),
    };
  },
  component: OpportunityPage,
});

function OpportunityPage() {
  const result = Route.useLoaderData();
  if (result.status === "found")
    return (
      <OpportunityDetail
        key={result.opportunity.id}
        opportunity={result.opportunity}
      />
    );
  return <OpportunityGone />;
}
