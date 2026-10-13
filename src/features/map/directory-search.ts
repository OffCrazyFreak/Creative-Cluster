import MiniSearch from "minisearch";

import type {
  IDirectoryEntry,
  IMapDirectory,
} from "@/features/directory/directory-schemas";

// Diacritics-insensitive so "zupanja" finds "Županja".
function normalize(term: string): string {
  return term
    .toLowerCase()
    .replaceAll("đ", "dj")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export type DirectorySearchIndex = MiniSearch<
  IDirectoryEntry & { tagText: string }
>;

export function createSearchIndex(
  directory: IMapDirectory,
): DirectorySearchIndex {
  const index: DirectorySearchIndex = new MiniSearch({
    idField: "slug",
    fields: ["name", "city", "blurb", "tagText"],
    storeFields: [],
    processTerm: normalize,
    searchOptions: {
      boost: { name: 3, tagText: 2 },
      prefix: true,
      fuzzy: 0.2,
      combineWith: "AND",
    },
  });
  index.addAll(
    directory.entries.map((entry) => ({
      ...entry,
      tagText: entry.tags
        .map((i) => `${directory.tags[i].en} ${directory.tags[i].hr}`)
        .join(" "),
    })),
  );
  return index;
}

// Ordered slugs, best match first.
export function searchSlugs(
  index: DirectorySearchIndex,
  query: string,
): string[] {
  return index.search(query).map((hit) => String(hit.id));
}
