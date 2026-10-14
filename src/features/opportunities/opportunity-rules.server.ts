import { and, eq, isNull } from "drizzle-orm";

import type { OpportunityRuleCode } from "@/constants/opportunities";
import type { Tx } from "@/db/client.server";
import { entry } from "@/db/schema";

import { isDeadlineAllowed } from "./opportunity-expiry";
import type { OpportunityInput } from "./opportunity-schemas";
import { usableTagSlugs } from "./opportunity-tags.server";

// Whitespace and case do not make a different post.
export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ");
}

// An erasure request freezes the listing, so "missing", "not yours" and "being erased" look the same.
export function ownedEntry(entryId: string, userId: string) {
  return and(
    eq(entry.id, entryId),
    eq(entry.ownerUserId, userId),
    isNull(entry.erasureRequestedAt),
  );
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
): Promise<IValueCheck> {
  if (values.deadline && !isDeadlineAllowed(values.deadline, now))
    return { code: "bad_deadline", tagSlugs: [] };
  const tagSlugs = await usableTagSlugs(tx, userId, values.tagIds);
  return tagSlugs
    ? { code: null, tagSlugs }
    : { code: "invalid_tags", tagSlugs: [] };
}
