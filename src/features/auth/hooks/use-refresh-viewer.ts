import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

// The viewer lives in the root route context, so login and logout must drop it and reload the matches.
export function useRefreshViewer() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return async function refreshViewer() {
    // ensureQueryData serves stale cache and account keys are not per user, so everything goes or the next user sees this one's data.
    queryClient.clear();
    await router.invalidate();
  };
}
