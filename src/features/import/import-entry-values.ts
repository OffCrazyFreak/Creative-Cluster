import { LISTING_LIMITS } from "@/constants/account";
import type { AppLocale } from "@/constants/locales";
import type { entry } from "@/db/schema";
import { parseRichText } from "@/lib/rich-text/parse-rich-text";

import type { StagingOrganization } from "./import-schemas";
import { plainTextToDoc } from "./plain-text-doc";

type NewEntry = typeof entry.$inferInsert;

// Contact details are stored for the owner but never shown to visitors until the owner decides.
const IMPORT_VISIBILITY = {
  website: "public",
  socials: "public",
  address: "public",
  contactName: "hidden",
  contactEmail: "hidden",
  contactPhone: "hidden",
} as const;

function orNull(value: string): string | null {
  return value === "" ? null : value;
}

export function entryValuesOf(
  org: StagingOrganization,
  context: { locale: AppLocale; source: string; now: Date },
): Omit<NewEntry, "slug"> {
  const description = parseRichText(plainTextToDoc(org.description), {
    maxChars: LISTING_LIMITS.description,
  });
  const references = org.references
    ? parseRichText(plainTextToDoc(org.references), {
        maxChars: LISTING_LIMITS.references,
      })
    : null;
  const { location } = org;
  const pinned = location.lat !== null && location.lng !== null;
  return {
    kind: "organization",
    status: "published",
    name: org.name,
    sourceLocale: context.locale,
    description: description.doc,
    descriptionText: description.text,
    seekingText: org.seekingText,
    website: orNull(org.website),
    socials: org.socials,
    contactName: orNull(org.contactName),
    contactEmail: orNull(org.contactEmail),
    contactPhone: orNull(org.contactPhone),
    visibility: IMPORT_VISIBILITY,
    extra: {
      legacy_id: org.legacyId,
      import_source: context.source,
      ...(org.legalStatus ? { legal_status: org.legalStatus } : {}),
      ...(references
        ? { references: references.doc, references_text: references.text }
        : {}),
    },
    addressText: orNull(location.addressText),
    lat: location.lat,
    lng: location.lng,
    city: location.city,
    countryCode: location.countryCode,
    precision: pinned ? location.precision : null,
    locationSource: pinned ? location.source : null,
    locationDisplay: location.precision === "town" ? "town" : "exact",
    geocodedAt: pinned && location.source ? context.now : null,
    importedAt: context.now,
    publishedAt: context.now,
  };
}
