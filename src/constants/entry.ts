export const ENTRY_KINDS = [
  "organization",
  "person",
  "outside_partner",
] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

export const ENTRY_STATUSES = [
  "draft",
  "pending",
  "published",
  "suspended",
  "rejected",
  "archived",
] as const;
export type EntryStatus = (typeof ENTRY_STATUSES)[number];

export const FIELD_VISIBILITIES = ["public", "members", "hidden"] as const;
export type FieldVisibility = (typeof FIELD_VISIBILITIES)[number];

export const LOCATION_PRECISIONS = ["house", "street", "town"] as const;
export type LocationPrecision = (typeof LOCATION_PRECISIONS)[number];

export const LOCATION_SOURCES = [
  "geoapify",
  "dgu",
  "photon",
  "nominatim",
  "manual",
  "town_list",
] as const;
export type LocationSource = (typeof LOCATION_SOURCES)[number];

export const LOCATION_DISPLAYS = ["exact", "town"] as const;
export type LocationDisplay = (typeof LOCATION_DISPLAYS)[number];
