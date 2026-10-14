import type { CaptureResult } from "posthog-js";

import { scrubUrl } from "../privacy/scrub-url";

// PostHog adds these on its own for every event, so they are cleaned centrally.
const URL_PROPERTIES = [
  "$current_url",
  "$pathname",
  "$referrer",
  "$initial_current_url",
  "$initial_pathname",
  "$initial_referrer",
] as const;

export function sanitizeEvent(
  event: CaptureResult | null,
): CaptureResult | null {
  if (!event?.properties) return event;
  for (const key of URL_PROPERTIES) {
    const value: unknown = event.properties[key];
    if (typeof value === "string") event.properties[key] = scrubUrl(value);
  }
  return event;
}
