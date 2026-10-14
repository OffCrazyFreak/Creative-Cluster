import { FIELD_VISIBILITIES, type FieldVisibility } from "@/constants/entry";

// Keys of entry.visibility. Name, description, offering, seeking, tags and town are always public.
export const VISIBILITY_FIELDS = [
  "website",
  "socials",
  "contactName",
  "contactEmail",
  "contactPhone",
  "address",
] as const;
export type VisibilityField = (typeof VISIBILITY_FIELDS)[number];

export type VisibilityMap = Partial<Record<string, unknown>>;

// A missing key means "members"; a stored value that is not one of the three is treated as hidden.
export function fieldVisibility(
  visibility: VisibilityMap,
  field: VisibilityField,
): FieldVisibility {
  const value = visibility[field];
  if (value === undefined) return "members";
  return FIELD_VISIBILITIES.find((item) => item === value) ?? "hidden";
}

// "members" means any logged-in user.
export function canSeeField(
  visibility: VisibilityMap,
  field: VisibilityField,
  isMember: boolean,
): boolean {
  const level = fieldVisibility(visibility, field);
  return level === "public" || (level === "members" && isMember);
}
