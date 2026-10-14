import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

// False during server render and hydration, true afterwards, without a flash of mismatched markup.
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
