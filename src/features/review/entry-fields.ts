import type { entry } from "@/db/schema";

// The only columns a revert may restore; slug, status, owner, trust and consent change through their own services.
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
