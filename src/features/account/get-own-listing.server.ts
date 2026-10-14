import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry, entryTag, image, reviewItem } from "@/db/schema";

import type { IOwnListing } from "./listing-types";
import { emptyTags } from "./listing-defaults";
import { formValuesOfRow, type IImageRow } from "./listing-values.server";

async function loadImages(ids: (string | null)[]) {
  const wanted = ids.filter((id): id is string => id !== null);
  const rows = wanted.length
    ? await db
        .select({
          id: image.id,
          hash: image.contentHash,
          width: image.width,
          height: image.height,
        })
        .from(image)
        .where(inArray(image.id, wanted))
    : [];
  return new Map<string, IImageRow>(rows.map((row) => [row.id, row]));
}

// The newest listing the user owns; erasure requests hide it from the owner area.
export async function findOwnListing(
  userId: string,
): Promise<IOwnListing | null> {
  const [row] = await db
    .select()
    .from(entry)
    .where(and(eq(entry.ownerUserId, userId), isNull(entry.erasureRequestedAt)))
    .orderBy(desc(entry.createdAt))
    .limit(1);
  if (!row) return null;

  const [images, tagRows, pending] = await Promise.all([
    loadImages([row.logoImageId, row.coverImageId]),
    db
      .select({ tagId: entryTag.tagId, field: entryTag.field })
      .from(entryTag)
      .where(eq(entryTag.entryId, row.id)),
    db
      .select({ id: reviewItem.id })
      .from(reviewItem)
      .where(
        and(
          eq(reviewItem.type, "untrusted_edit"),
          eq(reviewItem.entityId, row.id),
          eq(reviewItem.status, "open"),
        ),
      )
      .limit(1),
  ]);
  const tags = emptyTags();
  for (const { tagId, field } of tagRows) tags[field].push(tagId);

  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind,
    status: row.status,
    trusted: row.trusted,
    name: row.name,
    suspendedReason: row.status === "suspended" ? row.suspendedReason : null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    lastConfirmedAt: row.lastConfirmedAt?.toISOString() ?? null,
    hasPendingEdit: pending.length > 0,
    values: formValuesOfRow(
      row,
      {
        logo: row.logoImageId ? (images.get(row.logoImageId) ?? null) : null,
        cover: row.coverImageId ? (images.get(row.coverImageId) ?? null) : null,
      },
      tags,
    ),
  };
}
