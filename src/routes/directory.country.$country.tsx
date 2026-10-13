import {
  createFileRoute,
  Link,
  notFound,
  redirect,
  stripSearchParams,
} from "@tanstack/react-router";

import { countryName, isKnownCountry } from "@/features/directory/country-name";
import DirectoryListPage from "@/features/directory/components/directory-list-page";
import { directoryHead } from "@/features/directory/directory-head";
import {
  DIRECTORY_LIST_SEARCH_DEFAULTS,
  directoryListSearchSchema,
} from "@/features/directory/directory-list-search";
import { loadDirectoryList } from "@/features/directory/directory-list-route";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { site } from "@/sites";

export const Route = createFileRoute("/directory/country/$country")({
  validateSearch: directoryListSearchSchema,
  // Without stripping, the defaulted ?page=1 would be added to the URL by a redirect.
  search: { middlewares: [stripSearchParams(DIRECTORY_LIST_SEARCH_DEFAULTS)] },
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ params, deps }) => {
    if (!isKnownCountry(params.country)) throw notFound();
    if (params.country !== params.country.toLowerCase())
      throw redirect({
        to: "/directory/country/$country",
        params: { country: params.country.toLowerCase() },
        statusCode: 301,
      });
    return loadDirectoryList({ country: params.country, page: deps.page });
  },
  head: ({ params, match }) =>
    directoryHead(
      `/directory/country/${params.country.toLowerCase()}`,
      match.search.page,
      m.directory_country_title({
        country: countryName(params.country, getLocale()),
      }),
      m.directory_meta_description({ site: site.name }),
    ),
  component: DirectoryCountryPage,
});

function DirectoryCountryPage() {
  const list = Route.useLoaderData();
  const { country } = Route.useParams();
  if (list.status !== "ok") return null;
  return (
    <DirectoryListPage
      title={m.directory_country_title({
        country: countryName(country, getLocale()),
      })}
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
