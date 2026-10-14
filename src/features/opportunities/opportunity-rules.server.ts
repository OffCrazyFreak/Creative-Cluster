import { and, eq, isNull, ne, sql } from "drizzle-orm";

import type { OpportunityRuleCode } from "@/constants/opportunities";
import type { Tx } from "@/db/client.server";
import { entry, opportunity, user } from "@/db/schema";

import { openOpportunityCondition } from "./opportunity-conditions.server";
import { isDeadlineAllowed } from "./opportunity-expiry";
import type { OpportunityInput } from "./opportunity-schemas";
import { usableTagSlugs } from "./opportunity-tags.server";

// Whitespace and case do not make a different post.
export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ");
}

// The owner's row is the lock for all their posting rules (daily limit across entries, caps, titles),
// taken first by every service so two quick requests cannot both pass a check.
export async function lockOwner(tx: Tx, userId: string) {
  await tx
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, userId))
    .for("update");
}

// The listing the owner area shows: the newest one the user owns. An erasure request freezes it,
// so "missing", "not yours" and "being erased" look the same.
export async function lockOwnEntry(tx: Tx, userId: string) {
  const [owned] = await tx
    .select({ id: entry.id, status: entry.status, trusted: entry.trusted })
    .from(entry)
    .where(and(eq(entry.ownerUserId, userId), isNull(entry.erasureRequestedAt)))
    .orderBy(sql`${entry.createdAt} desc`)
    .limit(1)
    .for("update");
  return owned ?? null;
}

export interface IValueCheck {
  code: OpportunityRuleCode | null;
  tagSlugs: string[];
}

export async function checkValues(
  tx: Tx,
  userId: string,
  values: OpportunityInput,
  now: Date,
  // The deadline already stored on the post: leaving it unchanged is always fine.
  currentDeadline: string | null = null,
): Promise<IValueCheck> {
  if (
    values.deadline &&
    values.deadline !== currentDeadline &&
    !isDeadlineAllowed(values.deadline, now)
  )
    return { code: "bad_deadline", tagSlugs: [] };
  const tagSlugs = await usableTagSlugs(tx, userId, values.tagIds);
  return tagSlugs
    ? { code: null, tagSlugs }
    : { code: "invalid_tags", tagSlugs: [] };
}

// Compared in SQL with the same normalization as normalizeTitle, so titles stored by any path match.
export async function findDuplicateTitle(
  tx: Tx,
  entryId: string,
  title: string,
  excludeId?: string,
) {
  const [same] = await tx
    .select({ id: opportunity.id })
    .from(opportunity)
    .where(
      and(
        eq(opportunity.entryId, entryId),
        openOpportunityCondition(),
        excludeId ? ne(opportunity.id, excludeId) : undefined,
        sql`lower(regexp_replace(btrim(${opportunity.title}), '\s+', ' ', 'g')) = lower(${normalizeTitle(title)})`,
      ),
    )
    .limit(1);
  return Boolean(same);
}
