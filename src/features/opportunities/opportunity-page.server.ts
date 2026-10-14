import { and, eq } from "drizzle-orm";

import type { AppLocale } from "@/constants/locales";
import { db } from "@/db/client.server";
import { entry, image, opportunity, opportunityTag, tag } from "@/db/schema";
import { publicTagCondition } from "@/features/tags/tag-visibility.server";
import { toSerializableDoc } from "@/features/translation/translation-schemas";
import { EMPTY_RICH_TEXT } from "@/lib/rich-text/empty-rich-text";
import { safeParseRichText } from "@/lib/rich-text/parse-rich-text";

import { isExpired, pageGoneAt } from "./opportunity-expiry";
import {
  loadOpportunityTranslations,
  type IStoredTranslation,
} from "./opportunity-translations.server";
import type {
  IOpportunityPage,
  OpportunityPageResult,
  OpportunityPageState,
} from "./opportunity-page-schemas";

type Row = typeof opportunity.$inferSelect;

// Active posts are indexed. Ended ones (expired, or closed as filled) answer 200 with a banner
// for 30 days, then 410. Posts of a suspended entry or removed by an admin answer 410 at once.
function pageState(
  row: Row,
  now: Date,
): OpportunityPageState | "gone" | "missing" {
  if (row.status === "removed") return "gone";
  if (row.status === "closed")
    return row.closedAt && now < pageGoneAt(row.closedAt) ? "filled" : "gone";
  if (row.status !== "published") return "missing";
  if (!isExpired(row.expiresAt, now)) return "active";
  return now < pageGoneAt(row.expiresAt) ? "expired" : "gone";
}

export async function findOpportunityForPage(
  id: string,
  locale: AppLocale,
): Promise<OpportunityPageResult> {
  const [found] = await db
    .select({
      opp: opportunity,
      slug: entry.slug,
      name: entry.name,
      kind: entry.kind,
      entryStatus: entry.status,
      city: entry.city,
      country: entry.countryCode,
      logoId: image.id,
      logoHash: image.contentHash,
    })
    .from(opportunity)
    .innerJoin(entry, eq(entry.id, opportunity.entryId))
    .leftJoin(image, eq(image.id, entry.logoImageId))
    .where(eq(opportunity.id, id))
    .limit(1);
  if (!found || found.kind === "outside_partner") return { status: "missing" };
  if (found.entryStatus === "suspended") return { status: "gone" };
  if (found.entryStatus !== "published") return { status: "missing" };

  const state = pageState(found.opp, new Date());
  if (state === "gone" || state === "missing") return { status: state };

  const { opp } = found;
  const [tags, translations] = await Promise.all([
    db
      .select({
        slug: tag.slug,
        labelEn: tag.labelEn,
        labelHr: tag.labelHr,
      })
      .from(opportunityTag)
      .innerJoin(tag, eq(tag.id, opportunityTag.tagId))
      .where(and(eq(opportunityTag.opportunityId, id), publicTagCondition)),
    opp.sourceLocale === locale
      ? new Map<string, IStoredTranslation>()
      : loadOpportunityTranslations(db, [id], locale),
  ]);
  const translated = translations.get(id);
  const hasTranslation = Boolean(translated?.title || translated?.body);
  const body = safeParseRichText(opp.body)?.doc ?? EMPTY_RICH_TEXT;

  const opportunityPage: IOpportunityPage = {
    id,
    state,
    type: opp.type,
    category: opp.category,
    title: opp.title,
    body: toSerializableDoc(body),
    bodyText: opp.bodyText,
    sourceLocale: opp.sourceLocale,
    remoteOk: opp.remoteOk,
    deadline: opp.deadline,
    expiresAt: opp.expiresAt.toISOString(),
    entry: {
      slug: found.slug,
      name: found.name,
      city: found.city,
      country: found.country,
      logo:
        found.logoId && found.logoHash
          ? { id: found.logoId, hash: found.logoHash }
          : null,
    },
    tags,
    translation:
      hasTranslation && translated
        ? {
            title: translated.title ?? null,
            body: translated.body ? toSerializableDoc(translated.body) : null,
            origin: translated.origin ?? "machine",
          }
        : null,
    translationMissing: opp.sourceLocale !== locale && !hasTranslation,
  };
  return { status: "found", opportunity: opportunityPage };
}
