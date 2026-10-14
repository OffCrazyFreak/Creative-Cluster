import { SOCIAL_PLATFORMS } from "@/constants/account";
import type { EntryKind } from "@/constants/entry";
import type { entry } from "@/db/schema";
import { applyPersonOffset } from "@/features/location/person-offset-fn.server";
import { sourceLocaleOnSave } from "@/lib/translation/detect-locale";
import { normalizeHttpUrl } from "@/utils/http-url";

import { hasLegalStatus } from "./listing-rules";
import type { ListingInput } from "./listing-schemas";

type EntryRow = typeof entry.$inferSelect;

// Only columns an owner may change. The slug is deliberately absent: it stays frozen after publishing.
export type ListingPatch = Partial<typeof entry.$inferInsert>;

function orNull(value: string): string | null {
  return value === "" ? null : value;
}

function socialsOf(input: ListingInput["socials"]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const url = normalizeHttpUrl(input[platform]);
    if (url) result[platform] = url;
  }
  return result;
}

// Site rules live here, not in the form: people have no cover and no legal status, and
// legal status exists only where the site asks for it.
function extraOf(
  current: EntryRow["extra"],
  input: ListingInput,
  kind: EntryKind,
): Record<string, unknown> {
  const { legal_status: _legal, ...rest } = current;
  return {
    ...rest,
    ...(hasLegalStatus(kind) && input.legalStatus
      ? { legal_status: input.legalStatus }
      : {}),
    references: input.references.doc,
    references_text: input.references.text,
    logo_alt: input.logo?.altText || input.name,
    cover_alt: input.cover?.altText || input.name,
  };
}

type PatchRow = Pick<
  EntryRow,
  | "id"
  | "kind"
  | "descriptionText"
  | "offeringText"
  | "seekingText"
  | "extra"
  | "lat"
  | "lng"
  | "contactEmail"
  | "city"
  | "countryCode"
  | "precision"
  | "locationSource"
  | "locationDisplay"
>;

// People are never stored exactly: a new pin must come from the town list (which carries the population
// the offset needs); anything else keeps the stored pin or loses its coordinates.
function personLocation(row: PatchRow, input: ListingInput["location"]) {
  if (input.onlineOnly) {
    return {
      onlineOnly: false,
      addressText: null,
      lat: row.lat,
      lng: row.lng,
      city: row.city,
      countryCode: row.countryCode,
      precision: row.precision,
      source: row.locationSource,
      pinMovedByHand: false,
      display: row.locationDisplay,
    };
  }
  const moved = input.lat !== row.lat || input.lng !== row.lng;
  const fresh = input.townPopulation != null && input.source === "town_list";
  const location = applyPersonOffset(row.id, {
    ...input,
    onlineOnly: false,
    addressText: null,
    ...(moved && !fresh ? { lat: null, lng: null, source: null } : {}),
  });
  return {
    ...location,
    precision: location.lat === null ? null : ("town" as const),
    display: "town" as const,
  };
}

// The name is left out: it is mostly a proper noun and says little about the language.
function detectionText(source: {
  descriptionText: string;
  offeringText: string;
  seekingText: string;
}) {
  return [source.descriptionText, source.offeringText, source.seekingText].join(
    "\n",
  );
}

export function buildListingPatch(
  row: PatchRow,
  input: ListingInput,
): ListingPatch {
  const person = row.kind === "person";
  const location = person
    ? personLocation(row, input.location)
    : input.location;

  return {
    name: input.name,
    sourceLocale: sourceLocaleOnSave(
      detectionText({ ...input, descriptionText: input.description.text }),
      input.sourceLocale,
      detectionText(row),
    ),
    description: input.description.doc,
    descriptionText: input.description.text,
    offeringText: input.offeringText,
    seekingText: input.seekingText,
    website: normalizeHttpUrl(input.website),
    socials: socialsOf(input.socials),
    contactName: orNull(input.contactName),
    contactEmail: orNull(input.contactEmail),
    // A corrected address gets a fresh chance to receive mail.
    ...(orNull(input.contactEmail) !== row.contactEmail
      ? { contactEmailInvalid: false }
      : {}),
    contactPhone: orNull(input.contactPhone),
    visibility: input.visibility,
    extra: extraOf(row.extra, input, row.kind),
    logoImageId: input.logo?.id ?? null,
    coverImageId: person ? null : (input.cover?.id ?? null),
    matchingOptOut: input.matchingOptOut,
    onlineOnly: location.onlineOnly,
    addressText: location.addressText,
    lat: location.lat,
    lng: location.lng,
    city: location.city,
    countryCode: location.countryCode,
    precision: location.precision,
    locationSource: location.source,
    pinMovedByHand: location.pinMovedByHand,
    locationDisplay: location.display,
  };
}
