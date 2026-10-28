import { and, eq, inArray } from "drizzle-orm";

import type { TagField } from "@/constants/tags";
import type { Tx } from "@/db/client.server";
import { entryTag, tag } from "@/db/schema";

interface IResolveQueuedTags {
  entryId: string;
  field: TagField;
  submittedBy: string;
  ids: string[];
}

// A tag merged, rejected or taken off the field while the edit waited must not block approval: merges follow
// the surviving tag, rejections are dropped, and so is another member's pending suggestion an admin removed.
export async function resolveQueuedTags(
  tx: Tx,
  { entryId, field, submittedBy, ids }: IResolveQueuedTags,
): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await tx
    .select({
      id: tag.id,
      status: tag.status,
      canonicalId: tag.canonicalId,
      suggestedBy: tag.suggestedBy,
    })
    .from(tag)
    .where(inArray(tag.id, ids));
  const onField = new Set(
    (
      await tx
        .select({ tagId: entryTag.tagId })
        .from(entryTag)
        .where(and(eq(entryTag.entryId, entryId), eq(entryTag.field, field)))
    ).map((row) => row.tagId),
  );
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    if (!row) return [id];
    if (row.canonicalId) return [row.canonicalId];
    if (row.status === "rejected") return [];
    const othersPending =
      row.status === "suggested" && row.suggestedBy !== submittedBy;
    return othersPending && !onField.has(id) ? [] : [id];
  });
}
