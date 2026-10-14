import type { entry } from "@/db/schema";

// Entry columns an owner or admin edit may change, and the only ones a revert may restore.
// Slug (history rules), status, owner, trust and consent are changed by their own services.
export const ENTRY_REVERTIBLE_FIELDS = [
  "name",
  "description",
  "descriptionText",
  "offeringText",
  "seekingText",
  "website",
  "socials",
  "contactName",
  "contactEmail",
  "contactPhone",
  "visibility",
  "extra",
  "logoImageId",
  "coverImageId",
  "matchingOptOut",
  "onlineOnly",
  "addressText",
  "lat",
  "lng",
  "city",
  "countryCode",
  "precision",
  "locationSource",
  "pinMovedByHand",
  "locationDisplay",
] as const satisfies readonly (keyof typeof entry.$inferSelect)[];

export type RevertibleField = (typeof ENTRY_REVERTIBLE_FIELDS)[number];

export function isRevertibleField(key: string): key is RevertibleField {
  return (ENTRY_REVERTIBLE_FIELDS as readonly string[]).includes(key);
}

export function pickRevertible(
  source: Record<string, unknown>,
): Partial<Record<RevertibleField, unknown>> {
  return Object.fromEntries(
    Object.entries(source).filter(([key]) => isRevertibleField(key)),
  );
}
