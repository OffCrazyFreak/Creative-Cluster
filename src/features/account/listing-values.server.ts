import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/constants/account";
import type { FieldVisibility } from "@/constants/entry";
import { LOCALES } from "@/constants/locales";
import type { entry } from "@/db/schema";
import {
  fieldVisibility,
  VISIBILITY_FIELDS,
} from "@/features/entry/entry-visibility";
import type { LocationValue } from "@/features/location/location-schemas";
import { EMPTY_RICH_TEXT } from "@/lib/rich-text/empty-rich-text";
import { safeParseRichText } from "@/lib/rich-text/parse-rich-text";
import type { RichTextDoc } from "@/typings/rich-text";
import type { IImageFieldValue } from "@/typings/images";

import type { ListingFormValues } from "./listing-schemas";

type EntryRow = typeof entry.$inferSelect;

export interface IImageRow {
  id: string;
  hash: string;
  width: number;
  height: number;
}

export function locationOfRow(row: EntryRow): LocationValue {
  return {
    onlineOnly: row.onlineOnly,
    addressText: row.addressText,
    lat: row.lat,
    lng: row.lng,
    city: row.city,
    countryCode: row.countryCode,
    precision: row.precision,
    source: row.locationSource,
    pinMovedByHand: row.pinMovedByHand,
    display: row.locationDisplay,
  };
}

function imageValue(
  image: IImageRow | null,
  altText: unknown,
  fallback: string,
): IImageFieldValue | null {
  if (!image) return null;
  return {
    ...image,
    altText: typeof altText === "string" ? altText : fallback,
  };
}

function docOf(value: unknown): RichTextDoc {
  return safeParseRichText(value)?.doc ?? EMPTY_RICH_TEXT;
}

// The inverse of the patch builder: what the form shows for a stored row.
export function formValuesOfRow(
  row: EntryRow,
  images: { logo: IImageRow | null; cover: IImageRow | null },
  tags: ListingFormValues["tags"],
): ListingFormValues {
  const socials = Object.fromEntries(
    SOCIAL_PLATFORMS.map((platform) => [platform, row.socials[platform] ?? ""]),
  ) as Record<SocialPlatform, string>;
  const visibility = Object.fromEntries(
    VISIBILITY_FIELDS.map((field) => [
      field,
      fieldVisibility(row.visibility, field),
    ]),
  ) as Record<(typeof VISIBILITY_FIELDS)[number], FieldVisibility>;
  const legalStatus = row.extra.legal_status;

  return {
    name: row.name,
    sourceLocale: LOCALES.find((l) => l === row.sourceLocale) ?? LOCALES[0],
    description: docOf(row.description),
    offeringText: row.offeringText,
    seekingText: row.seekingText,
    website: row.website ?? "",
    socials,
    contactName: row.contactName ?? "",
    contactEmail: row.contactEmail ?? "",
    contactPhone: row.contactPhone ?? "",
    visibility,
    location: locationOfRow(row),
    logo: imageValue(images.logo, row.extra.logo_alt, row.name),
    cover: imageValue(images.cover, row.extra.cover_alt, row.name),
    tags,
    legalStatus: typeof legalStatus === "string" ? legalStatus : "",
    references: docOf(row.extra.references),
    matchingOptOut: row.matchingOptOut,
  };
}
