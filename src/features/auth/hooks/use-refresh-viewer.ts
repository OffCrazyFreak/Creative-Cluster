import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { VIEWER_QUERY_KEY } from "@/features/session/session-queries";

// The viewer lives in the root route context, so login and logout must drop it and reload the matches.
export function useRefreshViewer() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return async function refreshViewer() {
    // ensureQueryData serves stale cache, so the entry has to go, not just be marked stale.
    queryClient.removeQueries({ queryKey: VIEWER_QUERY_KEY });
    await router.invalidate();
  };
}
