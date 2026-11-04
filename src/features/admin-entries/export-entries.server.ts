import { asc, eq, isNull } from "drizzle-orm";
import Papa from "papaparse";

import { db } from "@/db/client.server";
import { entry, user } from "@/db/schema";

// Listed explicitly so an export with no rows still has its header line.
const COLUMNS = [
  "id",
  "slug",
  "name",
  "kind",
  "status",
  "trusted",
  "owner_email",
  "country",
  "city",
  "address",
  "lat",
  "lng",
  "website",
  "contact_name",
  "contact_email",
  "contact_phone",
  "contact_email_invalid",
  "source_locale",
  "description",
  "offering",
  "seeking",
  "created_at",
  "updated_at",
  "published_at",
  "last_confirmed_at",
  "imported_at",
] as const;

function iso(value: Date | null): string {
  return value?.toISOString() ?? "";
}

// Contact fields are on purpose (adminGuard only); listings queued for deletion are out because the owner asked for erasure.
export async function exportEntries(): Promise<string> {
  // Columns are picked one by one so the large jsonb fields are never loaded.
  const rows = await db
    .select({
      id: entry.id,
      slug: entry.slug,
      name: entry.name,
      kind: entry.kind,
      status: entry.status,
      trusted: entry.trusted,
      ownerEmail: user.email,
      countryCode: entry.countryCode,
      city: entry.city,
      addressText: entry.addressText,
      lat: entry.lat,
      lng: entry.lng,
      website: entry.website,
      contactName: entry.contactName,
      contactEmail: entry.contactEmail,
      contactPhone: entry.contactPhone,
      contactEmailInvalid: entry.contactEmailInvalid,
      sourceLocale: entry.sourceLocale,
      descriptionText: entry.descriptionText,
      offeringText: entry.offeringText,
      seekingText: entry.seekingText,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      publishedAt: entry.publishedAt,
      lastConfirmedAt: entry.lastConfirmedAt,
      importedAt: entry.importedAt,
    })
    .from(entry)
    .leftJoin(user, eq(user.id, entry.ownerUserId))
    .where(isNull(entry.erasureRequestedAt))
    .orderBy(asc(entry.name), asc(entry.id));

  return Papa.unparse(
    {
      fields: [...COLUMNS],
      data: rows.map((e) => ({
        id: e.id,
        slug: e.slug,
        name: e.name,
        kind: e.kind,
        status: e.status,
        trusted: e.trusted,
        owner_email: e.ownerEmail ?? "",
        country: e.countryCode ?? "",
        city: e.city ?? "",
        address: e.addressText ?? "",
        lat: e.lat ?? "",
        lng: e.lng ?? "",
        website: e.website ?? "",
        contact_name: e.contactName ?? "",
        contact_email: e.contactEmail ?? "",
        contact_phone: e.contactPhone ?? "",
        contact_email_invalid: e.contactEmailInvalid,
        source_locale: e.sourceLocale,
        description: e.descriptionText,
        offering: e.offeringText,
        seeking: e.seekingText,
        created_at: iso(e.createdAt),
        updated_at: iso(e.updatedAt),
        published_at: iso(e.publishedAt),
        last_confirmed_at: iso(e.lastConfirmedAt),
        imported_at: iso(e.importedAt),
      })),
    },
    // Cells starting with = + - @ would run as spreadsheet formulas; the pattern spans newlines and leaves plain phone numbers alone.
    {
      escapeFormulae: /^(?!\+[ \d()./-]*$)[=+\-@\t\r][\s\S]*$/,
      newline: "\r\n",
    },
  );
}
