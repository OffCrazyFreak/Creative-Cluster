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

// What a visitor gets for a post: a page (active, expired, filled), 410 (gone) or 404 (missing).
// Active posts are indexed. Ended ones stay up with a banner for 30 days, then answer 410. Removed
// posts, and posts of a suspended entry, answer 410 at once; unapproved posts are 404 whatever the
// entry's state, so a suspended entry cannot reveal them.
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
