import { useMutation, useQueryClient } from "@tanstack/react-query";

import { replaceSavedEntries } from "../saved.functions";
import { savedKeys } from "../saved-queries";
import type { ISavedEntry } from "../saved-schemas";

// Saves the full list, showing it at once and rolling back on failure.
export function useReplaceSavedEntries() {
  const queryClient = useQueryClient();
  return useMutation<
    ISavedEntry[],
    Error,
    ISavedEntry[],
    { previous: ISavedEntry[] | undefined }
  >({
    mutationKey: savedKeys.save(),
    // Each save replaces the whole list, so they must reach the server in click order.
    scope: { id: "saved-entries" },
    // Fail and roll back instead of pausing while offline.
    networkMode: "always",
    mutationFn: (entries) =>
      replaceSavedEntries({
        data: { keys: entries.map((item) => item.slug) },
      }),
    onMutate: async (entries) => {
      await queryClient.cancelQueries({ queryKey: savedKeys.all });
      const previous = queryClient.getQueryData<ISavedEntry[]>(savedKeys.all);
      queryClient.setQueryData<ISavedEntry[]>(savedKeys.all, entries);
      return { previous };
    },
    onError: (_error, _entries, context) => {
      queryClient.setQueryData(savedKeys.all, context?.previous);
    },
    // A refetch between queued saves would show an older list for a moment.
    onSettled: () =>
      queryClient.isMutating({ mutationKey: savedKeys.save() }) === 1
        ? queryClient.invalidateQueries({ queryKey: savedKeys.all })
        : undefined,
  });
}
