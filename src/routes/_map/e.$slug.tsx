import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import EntryDetail from "@/features/entry/components/entry-detail";
import EntryGone from "@/features/entry/components/entry-gone";
import { entryJsonLd } from "@/features/entry/entry-json-ld";
import { goneStatusMiddleware } from "@/features/entry/gone-status-middleware";
import { entryQueryOptions } from "@/features/entry/entry-queries";
import { placeLine } from "@/features/entry/components/entry-location";
import { useTrackEntryView } from "@/features/entry/use-track-entry-view";
import {
  indexedLocales,
  needsNoindex,
} from "@/features/translation/translation-indexing";
import { LOCALES } from "@/constants/locales";
import { publicConnectionsQuery } from "@/features/connections/connections-queries";
import { entryTranslationQueryOptions } from "@/features/translation/translation-queries";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { socialImageUrl } from "@/lib/images/image-url";
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
    // Connections are prefetched so the list is in the server-rendered HTML; they load alongside
    // the translation instead of after it.
    // Every other language is looked up so hreflang only names pages that are indexable. Only the
    // shown language may fail the page; another one that fails is left out of hreflang.
    const found = result.status === "found" ? result.entry : null;
    const others = found
      ? LOCALES.filter((locale) => locale !== found.sourceLocale)
      : [];
    const [views] = await Promise.all([
      found
        ? Promise.all(
            others.map((locale) => {
              const view = context.queryClient.fetchQuery(
                entryTranslationQueryOptions(
                  found.id,
                  locale,
                  context.viewer?.id ?? null,
                ),
              );
              return locale === getLocale()
                ? view
                : view.catch(() => undefined);
            }),
          )
        : [],
      found
        ? context.queryClient.prefetchQuery(publicConnectionsQuery(found.id))
        : null,
    ]);
    const byLocale = Object.fromEntries(
      others.map((locale, index) => [locale, views[index]]),
    );
    return {
      ...result,
      translation: byLocale[getLocale()] ?? null,
      alternates: indexedLocales(found?.sourceLocale ?? "", byLocale),
    };
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
        ...(entry.cover
          ? [
              { property: "og:image", content: socialImageUrl(entry.cover) },
              { name: "twitter:card", content: "summary_large_image" },
            ]
          : []),
        ...(noindex ? [{ name: "robots", content: "noindex, follow" }] : []),
      ],
      links: noindex
        ? [canonicalLink(`/e/${params.slug}`)]
        : indexableLinks(`/e/${params.slug}`, loaderData.alternates),
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
