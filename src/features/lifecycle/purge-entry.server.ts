import { and, eq, inArray, notExists, or, sql, type SQL } from "drizzle-orm";

import type { Tx } from "@/db/client.server";
import {
  entry,
  image,
  link,
  opportunity,
  reviewItem,
  translation,
} from "@/db/schema";
import { stripEntityChangeLog } from "@/features/changes/strip-change-log.server";

// Deletes a listing for good: its text, translations, posts, connections, queue items and images that
// nothing else uses. Change log rows stay for the audit trail but lose their identifiers.
// `onlyIf` is re-checked under the row lock, so a listing that changed since it was picked is left alone.
export async function purgeEntry(tx: Tx, entryId: string, onlyIf?: SQL) {
  const [row] = await tx
    .select({
      logo: entry.logoImageId,
      cover: entry.coverImageId,
      contactEmail: entry.contactEmail,
    })
    .from(entry)
    .where(and(eq(entry.id, entryId), onlyIf))
    .limit(1)
    .for("update");
  if (!row) return false;

  const posts = (
    await tx
      .select({ id: opportunity.id })
      .from(opportunity)
      .where(eq(opportunity.entryId, entryId))
  ).map((item) => item.id);
  const links = (
    await tx
      .select({ id: link.id })
      .from(link)
      .where(or(eq(link.fromId, entryId), eq(link.toId, entryId)))
  ).map((item) => item.id);

  await tx
    .delete(translation)
    .where(
      or(
        and(
          eq(translation.entityType, "entry"),
          eq(translation.entityId, entryId),
        ),
        posts.length
          ? and(
              eq(translation.entityType, "opportunity"),
              inArray(translation.entityId, posts),
            )
          : undefined,
      ),
    );
  // Mail already sent to the listing's contact address no longer needs the address; queued mail still does.
  if (row.contactEmail)
    await tx.execute(sql`
      update job
      set payload = jsonb_build_object('template', payload -> 'template', 'scrubbed', true)
      where status in ('done', 'failed')
        and type = 'email'
        and lower(payload ->> 'to') = ${row.contactEmail.toLowerCase()}`);
  const related = [entryId, ...posts, ...links];
  await tx.delete(reviewItem).where(inArray(reviewItem.entityId, related));
  for (const id of related) await stripEntityChangeLog(tx, id);

  // Opportunities, connections, tags, slug history and invites go with the entry (foreign key cascade).
  await tx.delete(entry).where(eq(entry.id, entryId));

  const images = [row.logo, row.cover].filter((id): id is string =>
    Boolean(id),
  );
  if (images.length)
    await tx.delete(image).where(
      and(
        inArray(image.id, images),
        notExists(
          tx
            .select({ one: entry.id })
            .from(entry)
            .where(
              or(
                eq(entry.logoImageId, image.id),
                eq(entry.coverImageId, image.id),
              ),
            ),
        ),
      ),
    );
  return true;
}
