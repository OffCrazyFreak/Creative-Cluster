import {
  createFileRoute,
  Link,
  stripSearchParams,
} from "@tanstack/react-router";

import DirectoryListPage from "@/features/directory/components/directory-list-page";
import { directoryHead } from "@/features/directory/directory-head";
import {
  DIRECTORY_LIST_SEARCH_DEFAULTS,
  directoryListSearchSchema,
} from "@/features/directory/directory-list-search";
import { loadDirectoryList } from "@/features/directory/directory-list-route";
import { tagLabel } from "@/features/directory/tag-label";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { site } from "@/sites";

export const Route = createFileRoute("/directory/tag/$tag")({
  validateSearch: directoryListSearchSchema,
  // Without stripping, the defaulted ?page=1 would be added to the URL by a redirect.
  search: { middlewares: [stripSearchParams(DIRECTORY_LIST_SEARCH_DEFAULTS)] },
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ params, deps }) =>
    loadDirectoryList({ tag: params.tag, page: deps.page }),
  head: ({ params, match, loaderData }) => {
    const label = loaderData?.tag
      ? tagLabel(loaderData.tag, getLocale())
      : params.tag;
    const title = m.directory_tag_title({ tag: label });
    return directoryHead(
      `/directory/tag/${params.tag}`,
      match.search.page,
      title,
      m.directory_meta_description({ site: site.name }),
    );
  },
  component: DirectoryTagPage,
});

function DirectoryTagPage() {
  const list = Route.useLoaderData();
  if (list.status !== "ok" || !list.tag) return null;
  return (
    <DirectoryListPage
      title={m.directory_tag_title({ tag: tagLabel(list.tag, getLocale()) })}
      items={list.items}
      total={list.total}
      page={list.page}
      pageCount={list.pageCount}
    >
      <p>
        <Link to="/directory">{m.directory_all_entries()}</Link>
      </p>
    </DirectoryListPage>
  );
}
