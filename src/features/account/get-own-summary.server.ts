import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry, reviewItem } from "@/db/schema";

import type { IOwnSummary } from "./listing-types";

// Unlike findOwnListing this still returns an entry with a pending erasure, so the owner sees that it is scheduled.
export async function findOwnSummary(
  userId: string,
): Promise<IOwnSummary | null> {
  const [row] = await db
    .select({
      id: entry.id,
      slug: entry.slug,
      kind: entry.kind,
      status: entry.status,
      name: entry.name,
      suspendedReason: entry.suspendedReason,
      updatedAt: entry.updatedAt,
      lastConfirmedAt: entry.lastConfirmedAt,
      erasureRequestedAt: entry.erasureRequestedAt,
    })
    .from(entry)
    .where(eq(entry.ownerUserId, userId))
    .orderBy(desc(entry.createdAt))
    .limit(1);
  if (!row) return null;

  const [pending] = await db
    .select({ id: reviewItem.id })
    .from(reviewItem)
    .where(
      and(
        eq(reviewItem.type, "untrusted_edit"),
        eq(reviewItem.entityId, row.id),
        eq(reviewItem.status, "open"),
      ),
    )
    .limit(1);

  return {
    ...row,
    suspendedReason: row.status === "suspended" ? row.suspendedReason : null,
    updatedAt: row.updatedAt.toISOString(),
    lastConfirmedAt: row.lastConfirmedAt?.toISOString() ?? null,
    erasureRequestedAt: row.erasureRequestedAt?.toISOString() ?? null,
    hasPendingEdit: Boolean(pending),
  };
}
