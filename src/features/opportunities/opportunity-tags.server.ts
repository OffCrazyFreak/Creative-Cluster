import { and, eq, inArray } from "drizzle-orm";

import type { Tx } from "@/db/client.server";
import { opportunityTag, tag } from "@/db/schema";
import { usableTagCondition } from "@/features/tags/tag-visibility.server";

// Same visibility rule as entry tags: a suggestion is usable only by the person who suggested it.
export async function usableTagSlugs(
  tx: Tx,
  userId: string,
  tagIds: string[],
): Promise<string[] | null> {
  if (tagIds.length === 0) return [];
  const rows = await tx
    .select({ slug: tag.slug })
    .from(tag)
    .where(and(inArray(tag.id, tagIds), usableTagCondition({ userId })));
  return rows.length === new Set(tagIds).size
    ? rows.map((row) => row.slug).sort()
    : null;
}

export async function currentTagSlugs(tx: Tx, opportunityId: string) {
  const rows = await tx
    .select({ slug: tag.slug })
    .from(opportunityTag)
    .innerJoin(tag, eq(tag.id, opportunityTag.tagId))
    .where(eq(opportunityTag.opportunityId, opportunityId));
  return rows.map((row) => row.slug).sort();
}

export async function replaceTags(
  tx: Tx,
  opportunityId: string,
  tagIds: string[],
) {
  await tx
    .delete(opportunityTag)
    .where(eq(opportunityTag.opportunityId, opportunityId));
  const unique = [...new Set(tagIds)];
  if (unique.length > 0) {
    await tx
      .insert(opportunityTag)
      .values(unique.map((tagId) => ({ opportunityId, tagId })));
  }
}
