import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client.server";
import { changeLog, entry, reviewItem, user } from "@/db/schema";
import { NotFoundError } from "@/server/errors";

import type {
  IAdminEntryDetail,
  IDetailField,
  IStatusChange,
} from "./admin-entries-schemas";

type EntryRow = typeof entry.$inferSelect;

function text(key: string, value: string | null): IDetailField {
  return { key, type: "text", value: value === "" ? null : value };
}
function bool(key: string, value: boolean): IDetailField {
  return { key, type: "bool", value: String(value) };
}
function date(key: string, value: Date | null): IDetailField {
  return { key, type: "date", value: value?.toISOString() ?? null };
}
function num(key: string, value: number | null): IDetailField {
  return text(key, value === null ? null : String(value));
}
function json(key: string, value: object): IDetailField {
  return {
    key,
    type: "json",
    value: Object.keys(value).length ? JSON.stringify(value, null, 2) : null,
  };
}

// Admins see contact fields; images are shown as present or absent because their bytes never leave the image route.
function fieldsOf(e: EntryRow): IDetailField[] {
  return [
    text("sourceLocale", e.sourceLocale),
    text("website", e.website),
    json("socials", e.socials),
    text("description", e.descriptionText),
    text("offering", e.offeringText),
    text("seeking", e.seekingText),
    text("contactName", e.contactName),
    text("contactEmail", e.contactEmail),
    text("contactPhone", e.contactPhone),
    bool("contactEmailInvalid", e.contactEmailInvalid),
    bool("trusted", e.trusted),
    bool("matchingOptOut", e.matchingOptOut),
    bool("onlineOnly", e.onlineOnly),
    text("addressText", e.addressText),
    text("city", e.city),
    text("countryCode", e.countryCode),
    num("lat", e.lat),
    num("lng", e.lng),
    text("precision", e.precision),
    text("locationSource", e.locationSource),
    bool("pinMovedByHand", e.pinMovedByHand),
    text("locationDisplay", e.locationDisplay),
    json("visibility", e.visibility),
    json("extra", e.extra),
    bool("hasLogo", e.logoImageId !== null),
    bool("hasCover", e.coverImageId !== null),
    date("consentAt", e.consentAt),
    text("consentVersion", e.consentVersion),
    text("suspendedReason", e.suspendedReason),
    date("createdAt", e.createdAt),
    date("updatedAt", e.updatedAt),
    date("publishedAt", e.publishedAt),
    date("lastConfirmedAt", e.lastConfirmedAt),
    date("importedAt", e.importedAt),
    date("erasureRequestedAt", e.erasureRequestedAt),
  ];
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

async function statusHistory(entryId: string): Promise<IStatusChange[]> {
  const rows = await db
    .select({
      id: changeLog.id,
      createdAt: changeLog.createdAt,
      actor: user.name,
      source: changeLog.source,
      before: changeLog.before,
      after: changeLog.after,
    })
    .from(changeLog)
    .leftJoin(user, eq(user.id, changeLog.userId))
    .where(
      and(
        eq(changeLog.entityType, "entry"),
        eq(changeLog.entityId, entryId),
        eq(changeLog.action, "status_change"),
      ),
    )
    .orderBy(desc(changeLog.createdAt))
    .limit(30);
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    actor: row.actor,
    source: row.source,
    from: asString(row.before?.status),
    to: asString(row.after?.status),
    reason: asString(row.after?.suspendedReason),
  }));
}

export async function getAdminEntryDetail(
  id: string,
): Promise<IAdminEntryDetail> {
  const [row] = await db.select().from(entry).where(eq(entry.id, id)).limit(1);
  if (!row) throw new NotFoundError();
  const e = row;
  const [history, reviews] = await Promise.all([
    statusHistory(id),
    db
      .select({
        id: reviewItem.id,
        type: reviewItem.type,
        createdAt: reviewItem.createdAt,
      })
      .from(reviewItem)
      .where(
        and(
          eq(reviewItem.entityType, "entry"),
          eq(reviewItem.entityId, id),
          eq(reviewItem.status, "open"),
        ),
      )
      .orderBy(desc(reviewItem.createdAt)),
  ]);
  return {
    id: e.id,
    name: e.name,
    kind: e.kind,
    status: e.status,
    slug: e.slug,
    lat: e.lat,
    lng: e.lng,
    countryCode: e.countryCode,
    fields: fieldsOf(e),
    history,
    reviews: reviews.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
