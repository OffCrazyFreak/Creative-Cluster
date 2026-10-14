import { and, eq, inArray, or } from "drizzle-orm";

import { db } from "@/db/client.server";
import {
  changeLog,
  entry,
  entryTag,
  entryViewDay,
  image,
  link,
  opportunity,
  reviewItem,
  tag,
  translation,
  user,
} from "@/db/schema";
import { NotFoundError } from "@/server/errors";
import { site } from "@/sites";

// Everything that belongs to one account: its profile, its listings and what hangs off them. Other people's
// data is left out: connections show the other listing's public name only, admins appear as a role.
export async function exportUserData(userId: string) {
  const [account] = await db
    .select({
      name: user.name,
      email: user.email,
      locale: user.locale,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!account) throw new NotFoundError();

  const listings = await db
    .select()
    .from(entry)
    .where(eq(entry.ownerUserId, userId));
  const ids = listings.map((row) => row.id);
  if (ids.length === 0)
    return bundle(account, [], {
      tags: [],
      opportunities: [],
      translations: [],
      connections: [],
      decisions: [],
      changes: [],
      views: [],
      images: [],
    });

  const imageIds = listings
    .flatMap((row) => [row.logoImageId, row.coverImageId])
    .filter((id): id is string => Boolean(id));
  const posts = await db
    .select()
    .from(opportunity)
    .where(inArray(opportunity.entryId, ids));
  const postIds = posts.map((row) => row.id);

  const [tags, translations, connections, decisions, changes, views, images] =
    await Promise.all([
      db
        .select({
          entryId: entryTag.entryId,
          field: entryTag.field,
          slug: tag.slug,
        })
        .from(entryTag)
        .innerJoin(tag, eq(tag.id, entryTag.tagId))
        .where(inArray(entryTag.entryId, ids)),
      db
        .select({
          entityType: translation.entityType,
          entityId: translation.entityId,
          field: translation.field,
          locale: translation.locale,
          text: translation.text,
          origin: translation.origin,
        })
        .from(translation)
        .where(
          or(
            and(
              eq(translation.entityType, "entry"),
              inArray(translation.entityId, ids),
            ),
            postIds.length
              ? and(
                  eq(translation.entityType, "opportunity"),
                  inArray(translation.entityId, postIds),
                )
              : undefined,
          ),
        ),
      db
        .select({
          id: link.id,
          fromId: link.fromId,
          toId: link.toId,
          kind: link.kind,
          status: link.status,
          year: link.year,
          endYear: link.endYear,
          project: link.project,
          note: link.note,
        })
        .from(link)
        .where(or(inArray(link.fromId, ids), inArray(link.toId, ids))),
      db
        .select({
          entityId: reviewItem.entityId,
          type: reviewItem.type,
          status: reviewItem.status,
          reasonCode: reviewItem.reasonCode,
          noteToApplicant: reviewItem.noteToApplicant,
          createdAt: reviewItem.createdAt,
          decidedAt: reviewItem.decidedAt,
        })
        .from(reviewItem)
        .where(
          and(
            inArray(reviewItem.entityId, ids),
            // A visitor's report about the listing is not the owner's data and may identify the reporter.
            inArray(reviewItem.type, ["application", "untrusted_edit"]),
          ),
        ),
      db
        .select({
          entityId: changeLog.entityId,
          source: changeLog.source,
          action: changeLog.action,
          changedFields: changeLog.changedFields,
          before: changeLog.before,
          after: changeLog.after,
          createdAt: changeLog.createdAt,
        })
        .from(changeLog)
        .where(
          and(
            eq(changeLog.entityType, "entry"),
            inArray(changeLog.entityId, ids),
          ),
        ),
      db.select().from(entryViewDay).where(inArray(entryViewDay.entryId, ids)),
      imageIds.length
        ? db
            .select({
              id: image.id,
              mime: image.mime,
              width: image.width,
              height: image.height,
              size: image.size,
              altText: image.altText,
            })
            .from(image)
            .where(inArray(image.id, imageIds))
        : Promise.resolve([]),
    ]);

  const otherIds = [
    ...new Set(connections.flatMap((row) => [row.fromId, row.toId])),
  ].filter((id) => !ids.includes(id));
  const others = otherIds.length
    ? await db
        .select({ id: entry.id, name: entry.name, slug: entry.slug })
        .from(entry)
        .where(inArray(entry.id, otherIds))
    : [];
  const otherById = new Map(others.map((row) => [row.id, row]));
  const connectionRows = connections.map(({ fromId, toId, ...rest }) => ({
    ...rest,
    from: ids.includes(fromId)
      ? "this listing"
      : (otherById.get(fromId) ?? null),
    to: ids.includes(toId) ? "this listing" : (otherById.get(toId) ?? null),
  }));

  return bundle(account, listings, {
    tags,
    opportunities: posts,
    translations,
    connections: connectionRows,
    decisions,
    changes,
    views,
    images,
  });
}

function bundle<T extends object>(
  account: unknown,
  listings: unknown[],
  related: T,
) {
  return {
    exportedAt: new Date().toISOString(),
    site: site.id,
    account,
    listings,
    ...related,
  };
}
