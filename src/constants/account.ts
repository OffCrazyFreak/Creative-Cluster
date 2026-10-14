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
