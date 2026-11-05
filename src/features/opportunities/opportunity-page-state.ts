import type { EntryStatus } from "@/constants/entry";
import {
  OPPORTUNITY_FILLED_REASON,
  type OpportunityStatus,
} from "@/constants/opportunities";

import { isExpired, pageGoneAt } from "./opportunity-expiry";
import type { OpportunityPageState } from "./opportunity-page-schemas";

interface IPageSubject {
  status: OpportunityStatus;
  closedReason: string | null;
  closedAt: Date | null;
  expiresAt: Date;
}

// Ended: banner 30 days, then 410. Removed or suspended: 410 at once. Unapproved: 404, so suspension cannot reveal it.
export function pageStateOf(
  post: IPageSubject,
  entryStatus: EntryStatus,
  now: Date,
): OpportunityPageState | "gone" | "missing" {
  if (post.status === "pending" || post.status === "rejected") return "missing";
  if (entryStatus === "suspended") return "gone";
  if (entryStatus !== "published") return "missing";
  if (post.status === "removed") return "gone";
  if (post.status === "closed")
    return post.closedReason === OPPORTUNITY_FILLED_REASON &&
      post.closedAt &&
      now < pageGoneAt(post.closedAt)
      ? "filled"
      : "gone";
  if (!isExpired(post.expiresAt, now)) return "active";
  return now < pageGoneAt(post.expiresAt) ? "expired" : "gone";
}
