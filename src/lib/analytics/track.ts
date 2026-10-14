import type { EntryKind } from "@/constants/entry";

import { capturePostHog } from "./posthog-client";

// Properties are coarse categories only: never names, emails, ids or free text.
export interface ITrackEvents {
  apply_started: { kind: EntryKind };
  apply_sent: { kind: EntryKind };
  contact_sent: { kind: EntryKind };
  filter_used: { filter: string };
  entry_viewed: { kind: EntryKind };
}

export type TrackEventName = keyof ITrackEvents;

export function track<E extends TrackEventName>(
  event: E,
  props: ITrackEvents[E],
): void {
  capturePostHog(event, props);
}
