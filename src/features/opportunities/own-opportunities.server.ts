import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { OPPORTUNITY_LIMITS as L } from "@/constants/opportunities";
import { db } from "@/db/client.server";
import { entry, opportunity, opportunityTag, reviewItem } from "@/db/schema";
import { EMPTY_RICH_TEXT } from "@/lib/rich-text/empty-rich-text";
import { safeParseRichText } from "@/lib/rich-text/parse-rich-text";

import { canRenew, isExpired, isExpiringSoon } from "./opportunity-expiry";
import { needsReview } from "./opportunity-limits.server";
import type {
  IOwnOpportunities,
  IOwnOpportunity,
  OwnOpportunityState,
} from "./opportunity-types";

type Row = typeof opportunity.$inferSelect;

function stateOf(row: Row, now: Date): OwnOpportunityState {
  if (row.status === "published") {
    if (isExpired(row.expiresAt, now)) return "expired";
    return isExpiringSoon(row.expiresAt, now) ? "expiring_soon" : "active";
  }
  if (row.status === "closed") return "filled";
  return row.status;
}

function toOwn(
  row: Row,
  tagIds: string[],
  rejection: string | null,
  now: Date,
): IOwnOpportunity {
  const state = stateOf(row, now);
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    category: row.category,
    state,
    deadline: row.deadline,
    expiresAt: row.expiresAt.toISOString(),
    renewals: row.renewals,
    canRenew: canRenew(row, now),
    reasonCode: state === "removed" ? row.closedReason : rejection,
    values: {
      type: row.type,
      category: row.category,
      title: row.title,
      body: safeParseRichText(row.body)?.doc ?? EMPTY_RICH_TEXT,
      sourceLocale: row.sourceLocale as "en" | "hr",
      remoteOk: row.remoteOk,
      deadline: row.deadline ?? "",
      tagIds,
    },
  };
}

// The newest listing the user owns, like the listing page; erasure requests hide it.
export async function listOwnOpportunities(
  userId: string,
): Promise<IOwnOpportunities> {
  const [owned] = await db
    .select({
      id: entry.id,
      name: entry.name,
      status: entry.status,
      trusted: entry.trusted,
    })
    .from(entry)
    .where(and(eq(entry.ownerUserId, userId), isNull(entry.erasureRequestedAt)))
    .orderBy(desc(entry.createdAt))
    .limit(1);
  if (!owned)
    return {
      entry: null,
      openCount: 0,
      canPost: false,
      nextPostReviewed: true,
      items: [],
    };

  const rows = await db
    .select()
    .from(opportunity)
    .where(eq(opportunity.entryId, owned.id))
    .orderBy(desc(opportunity.createdAt));
  const ids = rows.map((row) => row.id);
  const [tagRows, decisions] = ids.length
    ? await Promise.all([
        db
          .select()
          .from(opportunityTag)
          .where(inArray(opportunityTag.opportunityId, ids)),
        db
          .select({
            entityId: reviewItem.entityId,
            reasonCode: reviewItem.reasonCode,
          })
          .from(reviewItem)
          .where(
            and(
              eq(reviewItem.type, "opportunity"),
              eq(reviewItem.status, "rejected"),
              inArray(reviewItem.entityId, ids),
            ),
          )
          .orderBy(desc(reviewItem.decidedAt)),
      ])
    : [[], []];
  const rejections = new Map<string, string>();
  for (const item of decisions)
    if (item.reasonCode && !rejections.has(item.entityId))
      rejections.set(item.entityId, item.reasonCode);

  const now = new Date();
  const items = rows.map((row) =>
    toOwn(
      row,
      tagRows.filter((t) => t.opportunityId === row.id).map((t) => t.tagId),
      rejections.get(row.id) ?? null,
      now,
    ),
  );
  // The same rule the posting service counts with, so the button never disagrees with the server.
  const openCount = rows.filter(
    (row) =>
      ["pending", "published"].includes(row.status) && row.expiresAt > now,
  ).length;
  return {
    entry: { id: owned.id, name: owned.name, status: owned.status },
    openCount,
    nextPostReviewed: await needsReview(db, owned.id, owned.trusted),
    canPost: owned.status === "published" && openCount < L.activePerEntry,
    items,
  };
}
