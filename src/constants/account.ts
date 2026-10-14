export const SOCIAL_PLATFORMS = [
  "instagram",
  "facebook",
  "linkedin",
  "x",
  "youtube",
  "tiktok",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const LISTING_LIMITS = {
  name: 120,
  description: 5000,
  references: 5000,
  offering: 1000,
  seeking: 1000,
  url: 300,
  contactName: 120,
  contactEmail: 254,
  legalStatus: 120,
} as const;

// Statuses where the owner may edit; an erasure request blocks editing separately.
export const EDITABLE_ENTRY_STATUSES = [
  "draft",
  "pending",
  "published",
  "suspended",
  "rejected",
  "archived",
] as const;

// Bump when the shape of entry.extra changes.
export const ENTRY_EXTRA_VERSION = 1;
