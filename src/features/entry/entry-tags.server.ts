import { and, eq, inArray } from "drizzle-orm";

import type { DbOrTx } from "@/db/client.server";
import { entryTag, tag } from "@/db/schema";

import type { ITagRef } from "./entry-schemas";

// Only active tags are public (suggested ones stay with the suggester) and merged
// tags show as their canonical tag.
export async function loadPublicTags(
  db: DbOrTx,
  entryIds: string[],
): Promise<Map<string, ITagRef[]>> {
  const result = new Map<string, ITagRef[]>();
  if (entryIds.length === 0) return result;

  const rows = await db
    .select({
      entryId: entryTag.entryId,
      field: entryTag.field,
      tagId: tag.id,
      canonicalId: tag.canonicalId,
      slug: tag.slug,
      labelEn: tag.labelEn,
      labelHr: tag.labelHr,
      status: tag.status,
    })
    .from(entryTag)
    .innerJoin(tag, eq(tag.id, entryTag.tagId))
    .where(inArray(entryTag.entryId, entryIds));

  const canonicalIds = [
    ...new Set(
      rows.flatMap((row) => (row.canonicalId ? [row.canonicalId] : [])),
    ),
  ];
  const canonicals = canonicalIds.length
    ? await db
        .select()
        .from(tag)
        .where(and(inArray(tag.id, canonicalIds), eq(tag.status, "active")))
    : [];
  const canonicalById = new Map(canonicals.map((item) => [item.id, item]));

  const seen = new Set<string>();
  for (const row of rows) {
    const target = row.canonicalId
      ? canonicalById.get(row.canonicalId)
      : row.status === "active"
        ? {
            id: row.tagId,
            slug: row.slug,
            labelEn: row.labelEn,
            labelHr: row.labelHr,
          }
        : undefined;
    if (!target) continue;
    const key = `${row.entryId}:${target.id}:${row.field}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const list = result.get(row.entryId) ?? [];
    list.push({
      id: target.id,
      slug: target.slug,
      labelEn: target.labelEn,
      labelHr: target.labelHr,
      field: row.field,
    });
    result.set(row.entryId, list);
  }
  for (const list of result.values())
    list.sort((a, b) => a.labelEn.localeCompare(b.labelEn));
  return result;
}
