import { site } from "@/sites";
import { indexableLinks } from "@/utils/seo-links";

// Head tags for the list pages: page 2 and later are separate canonical URLs.
export function directoryHead(
  path: string,
  page: number,
  title: string,
  description: string,
) {
  const pagedPath = page > 1 ? `${path}?page=${page}` : path;
  return {
    meta: [
      { title: `${title} | ${site.name}` },
      { name: "description", content: description },
    ],
    links: indexableLinks(pagedPath),
  };
}
