import { queryOptions } from "@tanstack/react-query";

import { getChangeDetailFn, listChangesFn } from "./changes.functions";
import type { ChangesListInput } from "./changes-schemas";

export const CHANGES_KEY = ["admin", "changes"] as const;

export function changesQueryOptions(input: ChangesListInput) {
  return queryOptions({
    queryKey: [...CHANGES_KEY, "list", input],
    queryFn: () => listChangesFn({ data: input }),
  });
}

export function changeDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: [...CHANGES_KEY, "detail", id],
    queryFn: () => getChangeDetailFn({ data: { id } }),
  });
}
