import {
  and,
  asc,
  count,
  eq,
  exists,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db/client.server";
import { entry, entryTag, tag } from "@/db/schema";
import { loadPublicTags } from "@/features/entry/entry-tags.server";
import { publicEntryCondition } from "@/features/entry/public-entry-filter.server";

import { makeBlurb } from "./blurb";
import {
  DIRECTORY_PAGE_SIZE,
  type DirectoryListResult,
  type IDirectoryFacets,
  type IListItem,
  type ListInput,
} from "./directory-schemas";

async function findActiveTag(slug: string) {
  const [row] = await db
    .select()
    .from(tag)
    .where(sql`lower(${tag.slug}) = lower(${slug})`)
    .limit(1);
  if (!row) return null;
  if (row.canonicalId) {
    const [canonical] = await db
      .select()
      .from(tag)
      .where(eq(tag.id, row.canonicalId))
      .limit(1);
    return canonical?.status === "active" ? canonical : null;
  }
  return row.status === "active" ? row : null;
}

function tagCondition(tagId: string): SQL {
  const tagIds = db
    .select({ id: tag.id })
    .from(tag)
    .where(or(eq(tag.id, tagId), eq(tag.canonicalId, tagId)));
  return exists(
    db
      .select({ one: sql`1` })
      .from(entryTag)
      .where(
        and(eq(entryTag.entryId, entry.id), inArray(entryTag.tagId, tagIds)),
      ),
  );
}

export async function listPublicEntries(
  input: ListInput,
): Promise<DirectoryListResult> {
  const conditions: SQL[] = [publicEntryCondition()];
  let tagInfo: { slug: string; labelEn: string; labelHr: string } | null = null;

  if (input.tag) {
    const found = await findActiveTag(input.tag);
    if (!found) return { status: "missing" };
    if (found.slug !== input.tag)
      return { status: "redirect", tagSlug: found.slug };
    tagInfo = {
      slug: found.slug,
      labelEn: found.labelEn,
      labelHr: found.labelHr,
    };
    conditions.push(tagCondition(found.id));
  }
  if (input.country)
    conditions.push(
      sql`upper(${entry.countryCode}) = ${input.country.toUpperCase()}`,
    );

  const where = and(...conditions);
  const [{ total }] = await db
    .select({ total: count() })
    .from(entry)
    .where(where);
  const pageCount = Math.max(1, Math.ceil(total / DIRECTORY_PAGE_SIZE));
  if (input.page > pageCount) return { status: "missing" };
  if (input.country && total === 0) return { status: "missing" };

  const rows = await db
    .select({
      id: entry.id,
      slug: entry.slug,
      name: entry.name,
      kind: entry.kind,
      city: entry.city,
      countryCode: entry.countryCode,
      descriptionText: entry.descriptionText,
    })
    .from(entry)
    .where(where)
    .orderBy(asc(sql`lower(${entry.name})`), asc(entry.id))
    .limit(DIRECTORY_PAGE_SIZE)
    .offset((input.page - 1) * DIRECTORY_PAGE_SIZE);
  const tags = await loadPublicTags(
    db,
    rows.map((row) => row.id),
  );

  const items: IListItem[] = rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    kind: row.kind === "person" ? "person" : "organization",
    city: row.city,
    country: row.countryCode?.toUpperCase() ?? null,
    blurb: makeBlurb(row.descriptionText),
    tags: (tags.get(row.id) ?? [])
      .filter((item) => item.field === "topic")
      .map(({ slug, labelEn, labelHr }) => ({ slug, labelEn, labelHr })),
  }));
  return {
    status: "ok",
    items,
    total,
    page: input.page,
    pageCount,
    tag: tagInfo,
  };
}

// Links for the /directory index and the sitemap: only countries and tags that have published entries.
export async function listDirectoryFacets(): Promise<IDirectoryFacets> {
  const countryRows = await db
    .select({ key: sql<string>`upper(${entry.countryCode})`, count: count() })
    .from(entry)
    .where(and(publicEntryCondition(), sql`${entry.countryCode} is not null`))
    .groupBy(sql`upper(${entry.countryCode})`)
    .orderBy(asc(sql`upper(${entry.countryCode})`));

  const effectiveTagId = sql<string>`coalesce(${tag.canonicalId}, ${tag.id})`;
  const tagRows = await db
    .select({
      id: effectiveTagId,
      entries: sql<number>`count(distinct ${entryTag.entryId})::int`,
    })
    .from(entryTag)
    .innerJoin(tag, eq(tag.id, entryTag.tagId))
    .innerJoin(entry, eq(entry.id, entryTag.entryId))
    .where(publicEntryCondition())
    .groupBy(effectiveTagId);
  const ids = tagRows.map((row) => row.id);
  const tagInfo = ids.length
    ? await db
        .select()
        .from(tag)
        .where(and(inArray(tag.id, ids), eq(tag.status, "active")))
    : [];
  const counts = new Map(tagRows.map((row) => [row.id, row.entries]));

  return {
    countries: countryRows,
    tags: tagInfo
      .map((row) => ({
        slug: row.slug,
        labelEn: row.labelEn,
        labelHr: row.labelHr,
        count: counts.get(row.id) ?? 0,
      }))
      .sort((a, b) => a.labelEn.localeCompare(b.labelEn)),
  };
}

export async function listSitemapEntries() {
  return db
    .select({ slug: entry.slug, updatedAt: entry.updatedAt })
    .from(entry)
    .where(publicEntryCondition())
    .orderBy(asc(entry.slug));
}
