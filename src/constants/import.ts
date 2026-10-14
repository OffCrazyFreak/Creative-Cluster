// The old Creative Cluster app had exactly these five work domains; each maps to a seeded topic tag of the same slug.
export const LEGACY_DOMAIN_TAGS = [
  "art",
  "crafts",
  "ecology",
  "science",
  "technology",
] as const;
export type LegacyDomainTag = (typeof LEGACY_DOMAIN_TAGS)[number];

export const STAGING_VERSION = 1;

// Lets a person who is not the owner of the old data see where the rows came from.
export const LEGACY_SOURCE_LABEL = "legacy-creative-cluster";

export const CLAIM_INVITE_TTL_DAYS = 30;
export const CLAIM_REMINDER_AFTER_DAYS = 10;
export const CLAIMS_APPROVAL_ENV = "CLAIMS_SENDING_APPROVED";

export const SUPPRESSION_REASONS = ["claim_removal", "manual"] as const;
export type SuppressionReason = (typeof SUPPRESSION_REASONS)[number];
