import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

// The viewer lives in the root route context, so login and logout must drop it and reload the matches.
export function useRefreshViewer() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return async function refreshViewer() {
    // ensureQueryData serves stale cache, so entries have to go, not just be marked stale. Account and
    // admin keys are not scoped to a user, so everything goes or the next user on this tab sees the last one's data.
    queryClient.clear();
    await router.invalidate();
  };
}
