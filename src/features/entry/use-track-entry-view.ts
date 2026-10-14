import { useEffect } from "react";

import type { EntryKind } from "@/constants/entry";
import { track } from "@/lib/analytics/track";

import { trackEntryView } from "./entry.functions";

// One count per entry per page load: the frame can remount its panel when the map switches on.
const tracked = new Set<string>();

interface ITrackedEntry {
  slug: string;
  kind: EntryKind;
}

// Fired from the browser after hydration, so crawlers that do not run scripts and
// router prefetches never reach the counter; the server still checks the user agent.
export function useTrackEntryView(entry: ITrackedEntry | null) {
  const slug = entry?.slug ?? null;
  const kind = entry?.kind ?? null;
  useEffect(() => {
    if (!slug || !kind || tracked.has(slug)) return;
    tracked.add(slug);
    track("entry_viewed", { kind });
    void trackEntryView({ data: { slug } }).catch(() => undefined);
  }, [slug, kind]);
}
