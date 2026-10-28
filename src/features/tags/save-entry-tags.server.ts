import { and, eq, inArray, isNull, or } from "drizzle-orm";

import { MAX_TAGS_PER_FIELD, type TagField } from "@/constants/tags";
import { db, type Tx } from "@/db/client.server";
import { entry, entryTag, tag } from "@/db/schema";
import { writeChange } from "@/lib/change-log/write-change.server";
import { NotFoundError } from "@/server/errors";

import { TagSelectionError } from "./tag-errors";
import { usableTagCondition } from "./tag-visibility.server";

export interface ISaveEntryTags {
  entryId: string;
  field: TagField;
  tagIds: string[];
  // viaReview: an admin approved this owner edit, so the owner-only gates below no longer apply.
  actor: { userId: string; isAdmin: boolean; viaReview?: boolean };
}

// Replaces one field's tags in a single transaction; ownership is part of the same lookup.
export async function saveEntryTags(input: ISaveEntryTags) {
  return db.transaction((tx) => saveEntryTagsInTx(tx, input));
}

// For callers that already hold a transaction, so the tags commit or roll back with their other writes.
export async function saveEntryTagsInTx(
  tx: Tx,
  { entryId, field, tagIds, actor }: ISaveEntryTags,
) {
  const wanted = [...new Set(tagIds)];
  if (wanted.length > MAX_TAGS_PER_FIELD) {
    throw new TagSelectionError(`At most ${MAX_TAGS_PER_FIELD} tags per field`);
  }

  const [owned] = await tx
    .select({ id: entry.id })
    .from(entry)
    .where(
      and(
        eq(entry.id, entryId),
        actor.isAdmin ? undefined : eq(entry.ownerUserId, actor.userId),
        // An untrusted owner's tags wait in review, and an erasure request freezes the listing.
        actor.isAdmin || actor.viaReview
          ? undefined
          : and(eq(entry.trusted, true), isNull(entry.erasureRequestedAt)),
      ),
    );
  if (!owned) throw new NotFoundError();

  const current = await tx
    .select({ id: tag.id, slug: tag.slug })
    .from(entryTag)
    .innerJoin(tag, eq(tag.id, entryTag.tagId))
    .where(and(eq(entryTag.entryId, entryId), eq(entryTag.field, field)));
  // A tag already on the field stays valid even if the actor could not pick it (another member's pending
  // suggestion an admin added): the form sends it back, and refusing it would block every save of the field.
  const usable = current.length
    ? or(
        usableTagCondition(actor),
        inArray(
          tag.id,
          current.map((row) => row.id),
        ),
      )
    : usableTagCondition(actor);
  const allowed = wanted.length
    ? await tx
        .select({ id: tag.id, slug: tag.slug })
        .from(tag)
        .where(and(inArray(tag.id, wanted), usable))
    : [];
  if (allowed.length !== wanted.length) {
    throw new TagSelectionError("Unknown or unavailable tag");
  }

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
}
