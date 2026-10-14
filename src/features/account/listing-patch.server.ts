import { SOCIAL_PLATFORMS } from "@/constants/account";
import type { EntryKind } from "@/constants/entry";
import type { entry } from "@/db/schema";
import { applyPersonOffset } from "@/features/location/person-offset-fn.server";
import { normalizeHttpUrl } from "@/utils/http-url";

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
    ...(kind !== "person" && input.legalStatus
      ? { legal_status: input.legalStatus }
      : {}),
    references: input.references.doc,
    references_text: input.references.text,
    logo_alt: input.logo?.altText || input.name,
    cover_alt: input.cover?.altText || input.name,
  };
}

export function buildListingPatch(
  row: Pick<EntryRow, "id" | "kind" | "extra">,
  input: ListingInput,
): ListingPatch {
  const person = row.kind === "person";
  const location = person
    ? applyPersonOffset(row.id, {
        ...input.location,
        onlineOnly: false,
        addressText: null,
      })
    : input.location;

  return {
    name: input.name,
    sourceLocale: input.sourceLocale,
    description: input.description.doc,
    descriptionText: input.description.text,
    offeringText: input.offeringText,
    seekingText: input.seekingText,
    website: normalizeHttpUrl(input.website),
    socials: socialsOf(input.socials),
    contactName: orNull(input.contactName),
    contactEmail: orNull(input.contactEmail),
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
