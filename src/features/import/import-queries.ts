import { queryOptions } from "@tanstack/react-query";

import { listUnpinnedImports } from "./import.functions";

export const UNPINNED_IMPORTS_QUERY_KEY = [
  "admin",
  "import",
  "unpinned",
] as const;

export function unpinnedImportsQueryOptions() {
  return queryOptions({
    queryKey: UNPINNED_IMPORTS_QUERY_KEY,
    queryFn: () => listUnpinnedImports(),
  });
}
