import { useEffect } from "react";

import { trackEntryView } from "./entry.functions";

// One count per entry per page load: the frame can remount its panel when the map switches on.
const tracked = new Set<string>();

// Fired from the browser after hydration, so crawlers that do not run scripts and
// router prefetches never reach the counter; the server still checks the user agent.
export function useTrackEntryView(slug: string | null) {
  useEffect(() => {
    if (!slug || tracked.has(slug)) return;
    tracked.add(slug);
    void trackEntryView({ data: { slug } }).catch(() => undefined);
  }, [slug]);
}
