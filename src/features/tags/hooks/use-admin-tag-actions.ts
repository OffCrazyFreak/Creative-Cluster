import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  decideTagSuggestion,
  mergeTagsAsAdmin,
  updateTagAsAdmin,
} from "../admin-tags.functions";
import { tagKeys } from "../tag-queries";

// Every admin action changes what pickers and tables show, so all tag queries refetch.
export function useAdminTagActions() {
  const queryClient = useQueryClient();

  function onSuccess() {
    return queryClient.invalidateQueries({ queryKey: tagKeys.all });
  }
  return {
    update: useMutation({ mutationFn: updateTagAsAdmin, onSuccess }),
    decide: useMutation({ mutationFn: decideTagSuggestion, onSuccess }),
    merge: useMutation({ mutationFn: mergeTagsAsAdmin, onSuccess }),
  };
}
