import { Link } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { countryName } from "../country-name";
import type { IDirectoryFacets } from "../directory-schemas";
import { tagLabel } from "../tag-label";

interface IDirectoryFacetsProps {
  facets: IDirectoryFacets;
}

// Plain links to the tag and country pages: they are what search engines crawl.
export default function DirectoryFacets({ facets }: IDirectoryFacetsProps) {
  const locale = getLocale();
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <section aria-labelledby="facet-tags" className="flex flex-col gap-2">
        <h2 id="facet-tags" className="font-semibold">
          {m.directory_browse_tags()}
        </h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {facets.tags.map((item) => (
            <li key={item.slug}>
              <Link to="/directory/tag/$tag" params={{ tag: item.slug }}>
                {tagLabel(item, locale)} ({item.count})
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section
        aria-labelledby="facet-countries"
        className="flex flex-col gap-2"
      >
        <h2 id="facet-countries" className="font-semibold">
          {m.directory_browse_countries()}
        </h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {facets.countries.map((item) => (
            <li key={item.key}>
              <Link
                to="/directory/country/$country"
                params={{ country: item.key.toLowerCase() }}
              >
                {countryName(item.key, locale)} ({item.count})
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
