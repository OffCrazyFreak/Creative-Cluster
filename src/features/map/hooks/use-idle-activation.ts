import { useEffect } from "react";

// Runs after first paint when the browser is idle; Safari has no requestIdleCallback.
export function useIdleActivation(enabled: boolean, callback: () => void) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(callback, { timeout: 2000 });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = window.setTimeout(callback, 200);
    return () => window.clearTimeout(handle);
    // The callback is intentionally read once per activation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
