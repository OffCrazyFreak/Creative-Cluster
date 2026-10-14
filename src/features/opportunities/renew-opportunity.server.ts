import { eq } from "drizzle-orm";

import { OPPORTUNITY_LIMITS as L } from "@/constants/opportunities";
import { db } from "@/db/client.server";
import { opportunity } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";

import { afterOpportunityChange } from "./opportunity-effects.server";
import {
  canRenew,
  isDeadlineAllowed,
  isExpired,
  periodEnd,
  renewalStart,
} from "./opportunity-expiry";
import { countOpenPosts } from "./opportunity-limits.server";
import type { OpportunityResult } from "./opportunity-schemas";
import { lockOwnOpportunity } from "./own-opportunity-lock.server";

interface IRenewOpportunity {
  id: string;
  userId: string;
  // undefined keeps the post's deadline. A post that has one must pass a later one, because it ends
  // the day after it. An empty string drops the deadline and gives the default 60 days.
  deadline?: string;
}

// No re-review: the post was approved once, and a renewal only moves its end date.
export async function renewOpportunity({
  id,
  userId,
  deadline,
}: IRenewOpportunity): Promise<OpportunityResult> {
  const result = await db.transaction(
    async (tx): Promise<OpportunityResult> => {
      const now = new Date();
      const { row, entryStatus } = await lockOwnOpportunity(tx, id, userId);
      if (entryStatus !== "published")
        return { status: "refused", code: "entry_not_published" };
      if (!canRenew(row, now))
        return { status: "refused", code: "not_renewable" };

      // An expired post that comes back counts toward the cap again.
      if (
        isExpired(row.expiresAt, now) &&
        (await countOpenPosts(tx, row.entryId, id)) >= L.activePerEntry
      )
        return { status: "refused", code: "limit_active" };

      const nextDeadline =
        deadline === undefined ? row.deadline : deadline || null;
      if (nextDeadline && !isDeadlineAllowed(nextDeadline, now))
        return { status: "refused", code: "bad_deadline" };
      const expiresAt = periodEnd({
        start: renewalStart(row.expiresAt, now),
        deadline: nextDeadline,
      });
      if (expiresAt <= row.expiresAt)
        return { status: "refused", code: "bad_deadline" };

      await tx
        .update(opportunity)
        .set({
          expiresAt,
          deadline: nextDeadline,
          renewals: row.renewals + 1,
        })
        .where(eq(opportunity.id, id));
      await writeChange(tx, {
        entityType: "opportunity",
        entityId: id,
        userId,
        source: "owner",
        action: "update",
        before: {
          expiresAt: row.expiresAt.toISOString(),
          renewals: row.renewals,
          deadline: row.deadline,
        },
        after: {
          expiresAt: expiresAt.toISOString(),
          renewals: row.renewals + 1,
          deadline: nextDeadline,
        },
      });
      return { status: "saved" };
    },
  );
  if (result.status === "saved") await afterOpportunityChange();
  return result;
}
