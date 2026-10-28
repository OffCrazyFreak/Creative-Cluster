import { queryOptions } from "@tanstack/react-query";

import { getSavedEntries } from "./saved.functions";

export const savedKeys = {
  all: ["saved-entries"] as const,
  save: () => [...savedKeys.all, "save"] as const,
};

export function savedEntriesQuery() {
  return queryOptions({
    queryKey: savedKeys.all,
    queryFn: () => getSavedEntries(),
  });
}
