import type { IPublicEntry, ITagRef } from "./entry-schemas";
import { publicLocation, type ILocationRow } from "./public-location";
import { canSeeField, type VisibilityField } from "./entry-visibility";

export interface IEntryRow extends ILocationRow {
  id: string;
  slug: string;
  name: string;
  sourceLocale: string;
  descriptionText: string;
  offeringText: string;
  seekingText: string;
  website: string | null;
  socials: Record<string, string>;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactEmailInvalid: boolean;
  extra: Record<string, unknown>;
  publishedAt: Date | null;
  updatedAt: Date;
  lastConfirmedAt: Date | null;
}

export function redactEntry(
  row: IEntryRow,
  tags: ITagRef[],
  isMember: boolean,
): IPublicEntry {
  function visible<T>(field: VisibilityField, value: T): T | null {
    return canSeeField(row.visibility, field, isMember) ? value : null;
  }
  const contactEmail = visible("contactEmail", row.contactEmail);
  const contactPhone = visible("contactPhone", row.contactPhone);
  const legalStatus = row.extra.legal_status;

  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind as IPublicEntry["kind"],
    name: row.name,
    sourceLocale: row.sourceLocale,
    descriptionText: row.descriptionText,
    offeringText: row.offeringText,
    seekingText: row.seekingText,
    website: visible("website", row.website),
    socials: visible("socials", row.socials) ?? {},
    contactName: visible("contactName", row.contactName),
    contactEmail,
    contactPhone,
    // The contact relay goes through the server, so it works even when the address is hidden.
    hasContactChannel: Boolean(row.contactEmail) && !row.contactEmailInvalid,
    legalStatus: typeof legalStatus === "string" ? legalStatus : null,
    location: publicLocation(row, isMember),
    tags,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    lastConfirmedAt: row.lastConfirmedAt?.toISOString() ?? null,
  };
}
