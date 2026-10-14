import { queryOptions } from "@tanstack/react-query";

import { listAdminEntriesFn } from "./admin-entries.functions";
import type { AdminEntriesSearch } from "./admin-entries-schemas";

export const ADMIN_ENTRIES_KEY = ["admin", "entries"] as const;

export function adminEntriesQueryOptions(input: AdminEntriesSearch) {
  return queryOptions({
    queryKey: [...ADMIN_ENTRIES_KEY, "list", input],
    queryFn: () => listAdminEntriesFn({ data: input }),
  });
}

// Prefix of every admin query: entry actions refresh the list and the detail pages together.
export const ADMIN_KEY = ["admin"] as const;
