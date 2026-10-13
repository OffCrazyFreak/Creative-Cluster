import { and, eq, inArray } from "drizzle-orm";

import { MAX_TAGS_PER_FIELD, type TagField } from "@/constants/tags";
import { db } from "@/db/client.server";
import { entry, entryTag, tag } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { NotFoundError } from "@/server/errors";

import { TagSelectionError } from "./tag-errors";
import { usableTagCondition } from "./tag-visibility.server";

export interface ISaveEntryTags {
  entryId: string;
  field: TagField;
  tagIds: string[];
  actor: { userId: string; isAdmin: boolean };
}

// Replaces one field's tags in a single transaction; ownership is part of the same lookup.
export async function saveEntryTags({
  entryId,
  field,
  tagIds,
  actor,
}: ISaveEntryTags) {
  const wanted = [...new Set(tagIds)];
  if (wanted.length > MAX_TAGS_PER_FIELD) {
    throw new TagSelectionError(`At most ${MAX_TAGS_PER_FIELD} tags per field`);
  }

  return db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: entry.id })
      .from(entry)
      .where(
        and(
          eq(entry.id, entryId),
          actor.isAdmin ? undefined : eq(entry.ownerUserId, actor.userId),
        ),
      );
    if (!owned) throw new NotFoundError();

    const allowed = wanted.length
      ? await tx
          .select({ id: tag.id, slug: tag.slug })
          .from(tag)
          .where(and(inArray(tag.id, wanted), usableTagCondition(actor)))
      : [];
    if (allowed.length !== wanted.length) {
      throw new TagSelectionError("Unknown or unavailable tag");
    }

    const current = await tx
      .select({ id: tag.id, slug: tag.slug })
      .from(entryTag)
      .innerJoin(tag, eq(tag.id, entryTag.tagId))
      .where(and(eq(entryTag.entryId, entryId), eq(entryTag.field, field)));
    const currentIds = new Set(current.map((row) => row.id));
    const unchanged =
      currentIds.size === wanted.length &&
      wanted.every((id) => currentIds.has(id));
    if (unchanged) return { changed: false };

    await tx
      .delete(entryTag)
      .where(and(eq(entryTag.entryId, entryId), eq(entryTag.field, field)));
    if (wanted.length) {
      await tx
        .insert(entryTag)
        .values(wanted.map((tagId) => ({ entryId, tagId, field })));
    }
    await writeChange(tx, {
      entityType: "entry",
      entityId: entryId,
      userId: actor.userId,
      source: actor.isAdmin ? "admin" : "owner",
      action: "update",
      before: { [`tags_${field}`]: current.map((row) => row.slug).sort() },
      after: { [`tags_${field}`]: allowed.map((row) => row.slug).sort() },
    });
    return { changed: true };
  });
}
