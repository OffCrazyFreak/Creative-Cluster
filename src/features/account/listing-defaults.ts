import { SOCIAL_PLATFORMS } from "@/constants/account";
import { VISIBILITY_FIELDS } from "@/features/entry/entry-visibility";
import { emptyLocation } from "@/features/location/location-schemas";
import { EMPTY_RICH_TEXT } from "@/lib/rich-text/empty-rich-text";
import { site } from "@/sites";

import type { ListingFormValues } from "./listing-schemas";

// Croatian is the home country of the register; Creative Cluster has no default.
export const DEFAULT_COUNTRY = site.id === "dnz" ? "HR" : undefined;

// Shape only: withForm needs typed defaults, real values come from the loaded listing.
export function emptyListingValues(): ListingFormValues {
  return {
    name: "",
    sourceLocale: site.baseLocale,
    description: EMPTY_RICH_TEXT,
    offeringText: "",
    seekingText: "",
    website: "",
    socials: Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p, ""])) as Record<
      (typeof SOCIAL_PLATFORMS)[number],
      string
    >,
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    visibility: Object.fromEntries(
      VISIBILITY_FIELDS.map((field) => [field, "members"]),
    ) as ListingFormValues["visibility"],
    location: emptyLocation(DEFAULT_COUNTRY ?? null),
    logo: null,
    cover: null,
    tags: emptyTags(),
    legalStatus: "",
    references: EMPTY_RICH_TEXT,
    matchingOptOut: false,
  };
}

export function emptyTags(): ListingFormValues["tags"] {
  return { topic: [], offering: [], seeking: [] };
}
