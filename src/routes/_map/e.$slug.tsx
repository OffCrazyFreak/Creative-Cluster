import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import EntryDetail from "@/features/entry/components/entry-detail";
import EntryGone from "@/features/entry/components/entry-gone";
import { entryJsonLd } from "@/features/entry/entry-json-ld";
import { goneStatusMiddleware } from "@/features/entry/gone-status-middleware";
import { entryQueryOptions } from "@/features/entry/entry-queries";
import { placeLine } from "@/features/entry/components/entry-location";
import { useTrackEntryView } from "@/features/entry/use-track-entry-view";
import { m } from "@/paraglide/messages";
import { site } from "@/sites";
import { indexableLinks } from "@/utils/seo-links";
import { serializeJsonLd } from "@/utils/json-ld";

export const Route = createFileRoute("/_map/e/$slug")({
  server: { middleware: [goneStatusMiddleware] },
  loader: async ({ params, context }) => {
    const result = await context.queryClient.ensureQueryData(
      entryQueryOptions(params.slug, context.viewer?.id ?? null),
    );
    if (result.status === "missing") throw notFound();
    if (result.status === "redirect")
      throw redirect({
        to: "/e/$slug",
        params: { slug: result.slug },
        statusCode: 301,
      });
    return result;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData || loaderData.status === "gone")
      return {
        meta: [{ title: site.name }, { name: "robots", content: "noindex" }],
      };
    if (loaderData.status !== "found") return {};
    const { entry } = loaderData;
    const kind =
      entry.kind === "person"
        ? m.entry_kind_person()
        : m.entry_kind_organization();
    const description = entry.descriptionText
      ? entry.descriptionText.slice(0, 200)
      : m.entry_meta_description({
          name: entry.name,
          kind,
          place: placeLine(entry.location),
        });
    return {
      meta: [
        { title: `${entry.name} | ${site.name}` },
        { name: "description", content: description },
        { property: "og:title", content: entry.name },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
      ],
      links: indexableLinks(`/e/${params.slug}`),
      scripts: [
        {
          type: "application/ld+json",
          children: serializeJsonLd(entryJsonLd(entry)),
        },
      ],
    };
  },
  component: EntryPage,
});

function EntryPage() {
  const result = Route.useLoaderData();
  const { slug } = Route.useParams();
  useTrackEntryView(
    result.status === "found" ? { slug, kind: result.entry.kind } : null,
  );
  if (result.status === "found") return <EntryDetail entry={result.entry} />;
  return <EntryGone />;
}
