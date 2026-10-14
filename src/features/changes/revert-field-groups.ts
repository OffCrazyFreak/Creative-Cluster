import type { RevertibleField } from "@/features/review/entry-fields";

export const REVERT_FIELD_GROUPS = [
  "name",
  "description",
  "offering",
  "website",
  "contact",
  "visibility",
  "images",
  "location",
  "other",
] as const;
export type RevertFieldGroup = (typeof REVERT_FIELD_GROUPS)[number];

const GROUPS: Record<RevertibleField, RevertFieldGroup> = {
  name: "name",
  description: "description",
  descriptionText: "description",
  offeringText: "offering",
  seekingText: "offering",
  website: "website",
  socials: "website",
  contactName: "contact",
  contactEmail: "contact",
  contactPhone: "contact",
  visibility: "visibility",
  extra: "other",
  logoImageId: "images",
  coverImageId: "images",
  matchingOptOut: "other",
  onlineOnly: "location",
  addressText: "location",
  lat: "location",
  lng: "location",
  city: "location",
  countryCode: "location",
  precision: "location",
  locationSource: "location",
  pinMovedByHand: "location",
  locationDisplay: "location",
};

// The mail names groups ("contact details"), not column names the owner never saw.
export function revertFieldGroup(field: string): RevertFieldGroup {
  return GROUPS[field as RevertibleField] ?? "other";
}
