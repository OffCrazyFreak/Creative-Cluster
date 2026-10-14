import { and, count, eq, gt, sql } from "drizzle-orm";

import { OPPORTUNITY_LIMITS as L } from "@/constants/opportunities";
import type { DbOrTx, Tx } from "@/db/client.server";
import { entry, opportunity } from "@/db/schema";

import { openOpportunityCondition } from "./opportunity-conditions.server";
import { findDuplicateTitle } from "./opportunity-rules.server";

// Posts that count toward the per-entry cap: waiting for review, or live and not yet expired.
export async function countOpenPosts(
  tx: Tx,
  entryId: string,
  excludeId?: string,
) {
  const rows = await tx
    .select({ open: count() })
    .from(opportunity)
    .where(
      and(
        eq(opportunity.entryId, entryId),
        openOpportunityCondition(),
        excludeId ? sql`${opportunity.id} <> ${excludeId}` : undefined,
      ),
    );
  return rows[0].open;
}

// First refusal for a new post, or null when it may go ahead.
export async function newPostRefusal(
  tx: Tx,
  {
    entryId,
    userId,
    title,
  }: { entryId: string; userId: string; title: string },
) {
  if ((await countOpenPosts(tx, entryId)) >= L.activePerEntry)
    return "limit_active" as const;
  const [{ recent }] = await tx
    .select({ recent: count() })
    .from(opportunity)
    .innerJoin(entry, eq(entry.id, opportunity.entryId))
    .where(
      and(
        eq(entry.ownerUserId, userId),
        gt(opportunity.createdAt, sql`now() - interval '1 day'`),
      ),
    );
  if (recent >= L.newPerOwnerPerDay) return "limit_daily" as const;
  return (await findDuplicateTitle(tx, entryId, title))
    ? ("duplicate" as const)
    : null;
}

// The admin can force review for one entry; otherwise only an entry with no approved post yet.
export async function needsReview(
  tx: DbOrTx,
  entryId: string,
  trusted: boolean,
) {
  if (!trusted) return true;
  const [approved] = await tx
    .select({ id: opportunity.id })
    .from(opportunity)
    .where(
      and(
        eq(opportunity.entryId, entryId),
        sql`${opportunity.publishedAt} is not null`,
      ),
    )
    .limit(1);
  return !approved;
}
