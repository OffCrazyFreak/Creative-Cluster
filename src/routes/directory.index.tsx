import { createFileRoute, stripSearchParams } from "@tanstack/react-router";

import DirectoryFacets from "@/features/directory/components/directory-facets";
import DirectoryListPage from "@/features/directory/components/directory-list-page";
import { directoryFacetsQueryOptions } from "@/features/directory/directory-queries";
import { directoryHead } from "@/features/directory/directory-head";
import {
  DIRECTORY_LIST_SEARCH_DEFAULTS,
  directoryListSearchSchema,
} from "@/features/directory/directory-list-search";
import { loadDirectoryList } from "@/features/directory/directory-list-route";
import { m } from "@/paraglide/messages";
import { site } from "@/sites";

export const Route = createFileRoute("/directory/")({
  validateSearch: directoryListSearchSchema,
  // Without stripping, the defaulted ?page=1 would be added to the URL by a redirect.
  search: { middlewares: [stripSearchParams(DIRECTORY_LIST_SEARCH_DEFAULTS)] },
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps, context }) => {
    const [list, facets] = await Promise.all([
      loadDirectoryList({ page: deps.page }),
      context.queryClient.ensureQueryData(directoryFacetsQueryOptions()),
    ]);
    return { list, facets };
  },
  head: ({ match }) =>
    directoryHead(
      "/directory",
      match.search.page,
      m.directory_title(),
      m.directory_meta_description({ site: site.name }),
    ),
  component: DirectoryIndexPage,
});

function DirectoryIndexPage() {
  const { list, facets } = Route.useLoaderData();
  if (list.status !== "ok") return null;
  return (
    <DirectoryListPage
      title={m.directory_title()}
      intro={m.directory_intro()}
      items={list.items}
      total={list.total}
      page={list.page}
      pageCount={list.pageCount}
    >
      <DirectoryFacets facets={facets} />
    </DirectoryListPage>
  );
}
