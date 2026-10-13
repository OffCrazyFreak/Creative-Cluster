import { createFileRoute } from "@tanstack/react-router";

import { publishedDirectoryQueryOptions } from "@/features/directory/directory-queries";
import MapResultsList from "@/features/map/components/map-results-list";
import { hasActiveFilters } from "@/features/map/map-search";
import { m } from "@/paraglide/messages";
import { site } from "@/sites";
import { absoluteUrl, canonicalLink, indexableLinks } from "@/utils/seo-links";
import { serializeJsonLd } from "@/utils/json-ld";

export const Route = createFileRoute("/_map/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(publishedDirectoryQueryOptions()),
  head: ({ match }) => {
    // Filtered and viewport variants of "/" are duplicates: noindex, but links still count.
    const variant = hasActiveFilters(match.search) || Boolean(match.search.v);
    return {
      meta: [
        { title: site.name },
        {
          name: "description",
          content: m.directory_meta_description({ site: site.name }),
        },
        ...(variant ? [{ name: "robots", content: "noindex, follow" }] : []),
      ],
      links: variant ? [canonicalLink("/")] : indexableLinks("/"),
      scripts: [
        {
          type: "application/ld+json",
          children: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: site.name,
            url: absoluteUrl("/"),
          }),
        },
      ],
    };
  },
  component: MapResultsList,
});
