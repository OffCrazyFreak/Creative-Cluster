import { and, asc, eq, inArray } from "drizzle-orm";

import { TAG_FIELDS } from "@/constants/tags";
import { db } from "@/db/client.server";
import { entryTag, tag } from "@/db/schema";

import type { IEntryTags, ITagOption } from "./tag-schemas";
import {
  publicTagCondition,
  tagOptionColumns,
  usableTagCondition,
} from "./tag-visibility.server";

export async function listPickerTags(
  viewerUserId: string | null,
): Promise<ITagOption[]> {
  return db
    .select(tagOptionColumns)
    .from(tag)
    .where(usableTagCondition({ userId: viewerUserId }))
    .orderBy(asc(tag.labelEn));
}

export async function getEntryTags(
  entryId: string,
  viewerUserId: string | null,
): Promise<IEntryTags> {
  const rows = await db
    .select({ field: entryTag.field, ...tagOptionColumns })
    .from(entryTag)
    .innerJoin(tag, eq(tag.id, entryTag.tagId))
    .where(
      and(
        eq(entryTag.entryId, entryId),
        usableTagCondition({ userId: viewerUserId }),
      ),
    )
    .orderBy(asc(tag.labelEn));
  const result = Object.fromEntries(
    TAG_FIELDS.map((field) => [field, [] as ITagOption[]]),
  ) as IEntryTags;
  for (const { field, ...option } of rows) result[field].push(option);
  return result;
}

// Follows a merge so an old /directory/tag/<slug> link lands on the surviving tag.
export async function findPublicTagBySlug(
  slug: string,
): Promise<ITagOption | null> {
  const [found] = await db
    .select({ ...tagOptionColumns, canonicalId: tag.canonicalId })
    .from(tag)
    .where(eq(tag.slug, slug))
    .limit(1);
  if (!found) return null;
  const { canonicalId, ...option } = found;
  if (!canonicalId) return option.status === "active" ? option : null;
  const [target] = await db
    .select(tagOptionColumns)
    .from(tag)
    .where(and(eq(tag.id, canonicalId), publicTagCondition))
    .limit(1);
  return target ?? null;
}

export async function tagsById(ids: string[]) {
  if (ids.length === 0) return [];
  return db.select(tagOptionColumns).from(tag).where(inArray(tag.id, ids));
}
