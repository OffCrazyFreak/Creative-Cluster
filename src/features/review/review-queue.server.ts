import { dequal } from "dequal";
import {
  and,
  asc,
  count,
  eq,
  gte,
  inArray,
  lt,
  or,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { REVIEW_STALE_DAYS } from "@/constants/moderation";
import { REVIEW_PAGE_SIZE } from "@/constants/review";
import { db } from "@/db/client.server";
import { entry, opportunity, reviewItem, tag } from "@/db/schema";
import { BOUNCE_SOURCE } from "@/features/contact/bounce-events.server";

import { pickRevertible } from "./entry-fields";
import { storedReasonLabel } from "./review-labels";
import type {
  IReviewPage,
  IReviewRow,
  ReviewListInput,
} from "./review-schemas";

const DECIDABLE_TYPES = new Set([
  "application",
  "untrusted_edit",
  "opportunity",
  "report",
  "tag",
]);
const postingEntry = alias(entry, "posting_entry");
const SUMMARY_MAX = 300;

function staleBefore(): Date {
  return new Date(Date.now() - REVIEW_STALE_DAYS * 86_400_000);
}

function filters(input: ReviewListInput): SQL {
  const conditions: SQL[] = [eq(reviewItem.status, "open")];
  if (input.type) conditions.push(eq(reviewItem.type, input.type));
  if (input.country) {
    const code = input.country.toUpperCase();
    // Opportunity items belong to the country of the entry that posted them.
    conditions.push(
      or(
        eq(entry.countryCode, code),
        eq(postingEntry.countryCode, code),
      ) as SQL,
    );
  }
  if (input.age === "stale")
    conditions.push(lt(reviewItem.createdAt, staleBefore()));
  if (input.age === "fresh")
    conditions.push(gte(reviewItem.createdAt, staleBefore()));
  return and(...conditions) as SQL;
}

// Older queued patches are full form snapshots, so the useful summary is what differs from the live listing.
function changedFieldsOf(
  payload: Record<string, unknown>,
  current: Record<string, unknown> | undefined,
): string {
  const patch = payload.patch;
  if (typeof patch !== "object" || patch === null || !current) return "";
  return Object.entries(pickRevertible(patch as Record<string, unknown>))
    .filter(([key, value]) => !dequal(current[key], value))
    .map(([key]) => key)
    .join(", ");
}

function summaryOf(row: {
  type: string;
  entityType: string;
  payload: Record<string, unknown>;
  descriptionText: string | null;
  opportunityBody: string | null;
  current?: Record<string, unknown>;
}): string {
  if (row.type === "application")
    return (row.descriptionText ?? "").slice(0, SUMMARY_MAX);
  // The admin judges the whole post, so its text is not shortened (the post form caps it already).
  if (row.type === "opportunity") return row.opportunityBody ?? "";
  if (row.type === "report") {
    const { reason, message, source } = row.payload;
    // The automatic bounce text already says what happened; its fixed "other" reason adds nothing.
    const text = [
      source === BOUNCE_SOURCE ? null : storedReasonLabel(reason),
      message,
    ]
      .filter((v) => typeof v === "string" && v)
      .join(": ");
    return row.entityType === "opportunity" && row.opportunityBody
      ? `${text}\n\n${row.opportunityBody}`
      : text;
  }
  if (row.type === "untrusted_edit")
    return changedFieldsOf(row.payload, row.current);
  return "";
}

// Oldest first, so the items closest to the 7 day promise come first.
export async function listReviewItems(
  input: ReviewListInput,
): Promise<IReviewPage> {
  const where = filters(input);
  const base = db
    .select({
      id: reviewItem.id,
      type: reviewItem.type,
      entityType: reviewItem.entityType,
      entityId: reviewItem.entityId,
      payload: reviewItem.payload,
      createdAt: reviewItem.createdAt,
      entryName: entry.name,
      kind: entry.kind,
      countryCode: entry.countryCode,
      city: entry.city,
      descriptionText: entry.descriptionText,
      contactEmail: entry.contactEmail,
      tagLabel: tag.labelEn,
      opportunityTitle: opportunity.title,
      opportunityBody: opportunity.bodyText,
      postedBy: postingEntry.name,
      postingCountry: postingEntry.countryCode,
      postingCity: postingEntry.city,
    })
    .from(reviewItem)
    .leftJoin(
      entry,
      and(
        eq(reviewItem.entityType, "entry"),
        eq(entry.id, reviewItem.entityId),
      ),
    )
    .leftJoin(
      tag,
      and(eq(reviewItem.entityType, "tag"), eq(tag.id, reviewItem.entityId)),
    )
    .leftJoin(
      opportunity,
      and(
        eq(reviewItem.entityType, "opportunity"),
        eq(opportunity.id, reviewItem.entityId),
      ),
    )
    .leftJoin(postingEntry, eq(postingEntry.id, opportunity.entryId))
    .where(where);

  const [rows, [total]] = await Promise.all([
    base
      .orderBy(asc(reviewItem.createdAt), asc(reviewItem.id))
      .limit(REVIEW_PAGE_SIZE)
      .offset((input.page - 1) * REVIEW_PAGE_SIZE),
    db
      .select({ total: count() })
      .from(reviewItem)
      .leftJoin(
        entry,
        and(
          eq(reviewItem.entityType, "entry"),
          eq(entry.id, reviewItem.entityId),
        ),
      )
      .leftJoin(
        opportunity,
        and(
          eq(reviewItem.entityType, "opportunity"),
          eq(opportunity.id, reviewItem.entityId),
        ),
      )
      .leftJoin(postingEntry, eq(postingEntry.id, opportunity.entryId))
      .where(where),
  ]);

  const editedIds = rows
    .filter((row) => row.type === "untrusted_edit")
    .map((row) => row.entityId);
  const current = new Map(
    editedIds.length
      ? (await db.select().from(entry).where(inArray(entry.id, editedIds))).map(
          (row) => [row.id, row as Record<string, unknown>],
        )
      : [],
  );
  const limit = staleBefore().getTime();
  return {
    total: total?.total ?? 0,
    pageSize: REVIEW_PAGE_SIZE,
    rows: rows.map((row): IReviewRow => ({
      id: row.id,
      type: row.type,
      entityType: row.entityType,
      entityId: row.entityId,
      postedBy: row.postedBy,
      automatic: row.payload.source === BOUNCE_SOURCE,
      label: row.entryName ?? row.tagLabel ?? row.opportunityTitle ?? "",
      kind: row.kind,
      countryCode: row.countryCode ?? row.postingCountry,
      city: row.city ?? row.postingCity,
      summary: summaryOf({ ...row, current: current.get(row.entityId) }),
      contactEmail: row.type === "application" ? row.contactEmail : null,
      createdAt: row.createdAt.toISOString(),
      ageDays: Math.floor((Date.now() - row.createdAt.getTime()) / 86_400_000),
      stale: row.createdAt.getTime() < limit,
      decidable: DECIDABLE_TYPES.has(row.type),
    })),
  };
}
