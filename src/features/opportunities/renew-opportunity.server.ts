import { and, count, eq, ne, sql } from "drizzle-orm";

import { OPPORTUNITY_LIMITS as L } from "@/constants/opportunities";
import { db } from "@/db/client.server";
import { entry, opportunity } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { NotFoundError } from "@/server/errors";

import { openOpportunityCondition } from "./opportunity-conditions.server";
import { afterOpportunityChange } from "./opportunity-effects.server";
import {
  canRenew,
  isDeadlineAllowed,
  periodEnd,
  renewalStart,
} from "./opportunity-expiry";
import type { OpportunityResult } from "./opportunity-schemas";

interface IRenewOpportunity {
  id: string;
  userId: string;
  // undefined keeps the post's deadline; a posts with a deadline must pass a later one.
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
      const [current] = await tx
        .select({ row: opportunity, entryStatus: entry.status })
        .from(opportunity)
        .innerJoin(entry, eq(entry.id, opportunity.entryId))
        .where(
          and(
            eq(opportunity.id, id),
            eq(entry.ownerUserId, userId),
            sql`${entry.erasureRequestedAt} is null`,
          ),
        )
        .for("update", { of: opportunity });
      if (!current) throw new NotFoundError();
      const { row } = current;
      if (current.entryStatus !== "published")
        return { status: "refused", code: "entry_not_published" };
      if (!canRenew(row, now))
        return { status: "refused", code: "not_renewable" };

      const wasExpired = row.expiresAt <= now;
      if (wasExpired) {
        const [{ open }] = await tx
          .select({ open: count() })
          .from(opportunity)
          .where(
            and(
              eq(opportunity.entryId, row.entryId),
              ne(opportunity.id, id),
              openOpportunityCondition(),
            ),
          );
        if (open >= L.activePerEntry)
          return { status: "refused", code: "limit_active" };
      }

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
