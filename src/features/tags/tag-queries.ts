import { queryOptions } from "@tanstack/react-query";

import { listTagsForAdmin } from "./admin-tags.functions";
import { getTagsOfEntry, listTags } from "./tags.functions";

export const tagKeys = {
  all: ["tags"] as const,
  picker: () => [...tagKeys.all, "picker"] as const,
  entry: (entryId: string) => [...tagKeys.all, "entry", entryId] as const,
  admin: () => [...tagKeys.all, "admin"] as const,
};

export function pickerTagsQuery() {
  return queryOptions({
    queryKey: tagKeys.picker(),
    queryFn: () => listTags(),
    staleTime: 60_000,
  });
}

export function entryTagsQuery(entryId: string) {
  return queryOptions({
    queryKey: tagKeys.entry(entryId),
    queryFn: () => getTagsOfEntry({ data: { entryId } }),
  });
}

export function adminTagsQuery() {
  return queryOptions({
    queryKey: tagKeys.admin(),
    queryFn: () => listTagsForAdmin(),
  });
}
