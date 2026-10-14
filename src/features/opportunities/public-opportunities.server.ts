import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  inArray,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";

import {
  OPPORTUNITY_CLOSING_SOON_DAYS,
  OPPORTUNITY_LIST_MAX,
} from "@/constants/opportunities";
import { db } from "@/db/client.server";
import { entry, image, opportunity, opportunityTag, tag } from "@/db/schema";
import { makeBlurb } from "@/features/directory/blurb";
import { publicEntryCondition } from "@/features/entry/public-entry-filter.server";
import { publicTagCondition } from "@/features/tags/tag-visibility.server";

import { activeOpportunityCondition } from "./opportunity-conditions.server";
import { boardCondition } from "./public-opportunity-filter.server";
import { loadOpportunityTranslations } from "./opportunity-translations.server";
import type {
  IOpportunityTagRef,
  IPublicOpportunities,
  IPublicOpportunity,
  PublicOpportunitiesInput,
} from "./opportunity-list-schemas";

function filtersOf(input: PublicOpportunitiesInput): SQL[] {
  const filters: SQL[] = [boardCondition()];
  if (input.type) filters.push(eq(opportunity.type, input.type));
  if (input.category) filters.push(eq(opportunity.category, input.category));
  if (input.country)
    filters.push(eq(entry.countryCode, input.country.toUpperCase()));
  // Only live posts can be closing: a post filled this week keeps its old end date but is not open.
  if (input.closing)
    filters.push(
      activeOpportunityCondition(),
      lte(
        opportunity.expiresAt,
        sql`now() + make_interval(days => ${OPPORTUNITY_CLOSING_SOON_DAYS})`,
      ),
    );
  if (input.tags?.length)
    filters.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(opportunityTag)
          .innerJoin(tag, eq(tag.id, opportunityTag.tagId))
          .where(
            and(
              eq(opportunityTag.opportunityId, opportunity.id),
              inArray(tag.slug, input.tags),
              publicTagCondition,
            ),
          ),
      ),
    );
  return filters;
}

async function loadTags(ids: string[]) {
  const byPost = new Map<string, IOpportunityTagRef[]>();
  if (ids.length === 0) return byPost;
  const rows = await db
    .select({
      opportunityId: opportunityTag.opportunityId,
      slug: tag.slug,
      labelEn: tag.labelEn,
      labelHr: tag.labelHr,
    })
    .from(opportunityTag)
    .innerJoin(tag, eq(tag.id, opportunityTag.tagId))
    .where(and(inArray(opportunityTag.opportunityId, ids), publicTagCondition));
  for (const { opportunityId, ...ref } of rows)
    byPost.set(opportunityId, [...(byPost.get(opportunityId) ?? []), ref]);
  return byPost;
}

const FACETS_CACHE_MS = 30_000;
let facetsCache: { at: number; value: IPublicOpportunities["facets"] } | null =
  null;

// Mutation services call this after any change that adds or removes live posts.
export function invalidateOpportunityFacets() {
  facetsCache = null;
}

// The options do not depend on the filters, so one short-lived copy serves every request.
async function loadFacets(): Promise<IPublicOpportunities["facets"]> {
  if (facetsCache && Date.now() - facetsCache.at < FACETS_CACHE_MS)
    return facetsCache.value;
  const value = await queryFacets();
  facetsCache = { at: Date.now(), value };
  return value;
}

async function queryFacets(): Promise<IPublicOpportunities["facets"]> {
  const [countries, tags] = await Promise.all([
    db
      .selectDistinct({ code: entry.countryCode })
      .from(opportunity)
      .innerJoin(entry, eq(entry.id, opportunity.entryId))
      .where(boardCondition()),
    db
      .selectDistinct({
        slug: tag.slug,
        labelEn: tag.labelEn,
        labelHr: tag.labelHr,
      })
      .from(opportunity)
      .innerJoin(entry, eq(entry.id, opportunity.entryId))
      .innerJoin(
        opportunityTag,
        eq(opportunityTag.opportunityId, opportunity.id),
      )
      .innerJoin(tag, eq(tag.id, opportunityTag.tagId))
      .where(and(boardCondition(), publicTagCondition)),
  ]);
  return {
    countries: countries.flatMap((row) => (row.code ? [row.code] : [])).sort(),
    tags,
  };
}

// Sorted by deadline (posts without one last), then newest. Posts filled this week come after live ones.
export async function listPublicOpportunities(
  input: PublicOpportunitiesInput,
): Promise<IPublicOpportunities> {
  const rows = await db
    .select({
      opp: opportunity,
      slug: entry.slug,
      name: entry.name,
      city: entry.city,
      country: entry.countryCode,
      logoId: image.id,
      logoHash: image.contentHash,
    })
    .from(opportunity)
    .innerJoin(entry, eq(entry.id, opportunity.entryId))
    .leftJoin(image, eq(image.id, entry.logoImageId))
    .where(and(...filtersOf(input)))
    .orderBy(
      asc(sql`${opportunity.status} = 'closed'`),
      asc(sql`${opportunity.deadline} is null`),
      asc(opportunity.deadline),
      desc(opportunity.publishedAt),
    )
    .limit(OPPORTUNITY_LIST_MAX);
  const ids = rows.map((row) => row.opp.id);
  const [[{ total }], tagsByPost, translations, facets] = await Promise.all([
    db
      .select({ total: count() })
      .from(opportunity)
      .innerJoin(entry, eq(entry.id, opportunity.entryId))
      .where(and(...filtersOf(input))),
    loadTags(ids),
    loadOpportunityTranslations(db, ids, input.locale),
    loadFacets(),
  ]);

  const items: IPublicOpportunity[] = rows.map(({ opp, ...row }) => {
    const translated = translations.get(opp.id);
    const snippet = translated?.bodyText ?? opp.bodyText;
    return {
      id: opp.id,
      type: opp.type,
      category: opp.category,
      title: translated?.title ?? opp.title,
      titleLang: translated?.title ? input.locale : opp.sourceLocale,
      snippet: makeBlurb(snippet),
      snippetLang: translated?.bodyText ? input.locale : opp.sourceLocale,
      remoteOk: opp.remoteOk,
      deadline: opp.deadline,
      expiresAt: opp.expiresAt.toISOString(),
      filled: opp.status === "closed",
      entry: {
        slug: row.slug,
        name: row.name,
        city: row.city,
        country: row.country,
        logo:
          row.logoId && row.logoHash
            ? { id: row.logoId, hash: row.logoHash }
            : null,
      },
      tags: tagsByPost.get(opp.id) ?? [],
    };
  });
  return { items, total, facets };
}

// Entries with live posts, for the badge on their map pins.
export async function countActiveByEntry(): Promise<Map<string, number>> {
  const rows = await db
    .select({ entryId: opportunity.entryId, n: sql<number>`count(*)::int` })
    .from(opportunity)
    .innerJoin(entry, eq(entry.id, opportunity.entryId))
    .where(and(activeOpportunityCondition(), publicEntryCondition()))
    .groupBy(opportunity.entryId);
  return new Map(rows.map((row) => [row.entryId, row.n]));
}

// Only live posts are indexed; ended pages leave the sitemap at once (they are noindex, then 410).
export async function listSitemapOpportunities() {
  return db
    .select({ id: opportunity.id, updatedAt: opportunity.updatedAt })
    .from(opportunity)
    .innerJoin(entry, eq(entry.id, opportunity.entryId))
    .where(and(activeOpportunityCondition(), publicEntryCondition()))
    .orderBy(asc(opportunity.id));
}
