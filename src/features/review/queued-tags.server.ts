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

// A tag merged, rejected or removed while the edit waited must not block approval, so merges follow the survivor and the rest drop.
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
