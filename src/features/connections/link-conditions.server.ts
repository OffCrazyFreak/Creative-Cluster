import { and, eq, gt, or, sql, type SQL } from "drizzle-orm";

import { LINK_LIMITS } from "@/constants/links";
import { link } from "@/db/schema";

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysAgo(days: number, now = new Date()): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

// A proposal older than the auto-withdraw window counts as withdrawn immediately,
// even before the daily job writes the new status.
export function isLiveLink(now = new Date()): SQL {
  return and(
    or(
      eq(link.status, "confirmed"),
      and(
        eq(link.status, "proposed"),
        gt(link.createdAt, daysAgo(LINK_LIMITS.autoWithdrawDays, now)),
      ),
    ),
  ) as SQL;
}

// The entry that has to decide: the end that did not propose.
export const recipientEntryId = sql`case when ${link.proposedByEntryId} = ${link.fromId} then ${link.toId} else ${link.fromId} end`;
