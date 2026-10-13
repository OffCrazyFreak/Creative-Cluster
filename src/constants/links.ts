export const LINK_KINDS = [
  "collaborated",
  "eu_partner",
  "member_of",
  "supplier",
  "mentor",
] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

// Kinds without a direction are stored once with from_id < to_id.
export const SYMMETRIC_LINK_KINDS: readonly LinkKind[] = [
  "collaborated",
  "eu_partner",
];

export const LINK_STATUSES = [
  "proposed",
  "confirmed",
  "rejected",
  "withdrawn",
] as const;
export type LinkStatus = (typeof LINK_STATUSES)[number];

export const LINK_LIMITS = {
  autoWithdrawDays: 60,
  rejectCooldownDays: 30,
  proposalsPerOwnerPerDay: 10,
  graphPartners: 15,
} as const;
