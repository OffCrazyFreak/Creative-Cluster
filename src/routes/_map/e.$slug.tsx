import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import EntryDetail from "@/features/entry/components/entry-detail";
import EntryGone from "@/features/entry/components/entry-gone";
import { entryJsonLd } from "@/features/entry/entry-json-ld";
import { goneStatusMiddleware } from "@/features/entry/gone-status-middleware";
import { entryQueryOptions } from "@/features/entry/entry-queries";
import { placeLine } from "@/features/entry/components/entry-location";
import { useTrackEntryView } from "@/features/entry/use-track-entry-view";
import { needsNoindex } from "@/features/translation/translation-indexing";
import { entryTranslationQueryOptions } from "@/features/translation/translation-queries";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { site } from "@/sites";
import { canonicalLink, indexableLinks } from "@/utils/seo-links";
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
    const translation =
      result.status === "found" && result.entry.sourceLocale !== getLocale()
        ? await context.queryClient.fetchQuery(
            entryTranslationQueryOptions(
              result.entry.id,
              getLocale(),
              context.viewer?.id ?? null,
            ),
          )
        : null;
    return { ...result, translation };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData || loaderData.status === "gone")
      return {
        meta: [{ title: site.name }, { name: "robots", content: "noindex" }],
      };
    if (loaderData.status !== "found") return {};
    const { entry, translation } = loaderData;
    const shownText =
      translation?.texts.description?.text ?? entry.descriptionText;
    // The page still shows the owner's language until a translation is stored: keep it out of the
    // index and do not advertise it as an alternate.
    const noindex = needsNoindex(translation);
    const kind =
      entry.kind === "person"
        ? m.entry_kind_person()
        : m.entry_kind_organization();
    const description = shownText
      ? shownText.slice(0, 200)
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
        ...(noindex ? [{ name: "robots", content: "noindex, follow" }] : []),
      ],
      links: noindex
        ? [canonicalLink(`/e/${params.slug}`)]
        : indexableLinks(`/e/${params.slug}`),
      scripts: [
        {
          type: "application/ld+json",
          children: serializeJsonLd(entryJsonLd(entry, shownText)),
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
  // Keyed by entry so the toggle and the edit form never carry over to the next entry.
  if (result.status === "found")
    return (
      <EntryDetail
        key={result.entry.id}
        entry={result.entry}
        translation={result.translation}
      />
    );
  return <EntryGone />;
}
