export const OPPORTUNITY_TYPES = ["seeking", "offering"] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

export const OPPORTUNITY_CATEGORIES = [
  "partner",
  "skill",
  "space",
  "service",
  "funding_call_partner",
  "other",
] as const;
export type OpportunityCategory = (typeof OPPORTUNITY_CATEGORIES)[number];

export const OPPORTUNITY_STATUSES = [
  "pending",
  "published",
  "closed",
  "rejected",
  "removed",
] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export const OPPORTUNITY_LIMITS = {
  titleLength: 120,
  bodyLength: 1000,
  activePerEntry: 3,
  newPerOwnerPerDay: 3,
  maxRenewals: 3,
  defaultLifetimeDays: 60,
  maxLifetimeDays: 180,
  renewWindowDays: 8,
  filledLabelDays: 7,
  closedNoindexDays: 30,
} as const;

export const OPPORTUNITY_TAG_MAX = 5;

// Why a rule refused a post. The service returns these; the UI maps each to a message.
export const OPPORTUNITY_RULE_CODES = [
  "entry_not_published",
  "limit_active",
  "limit_daily",
  "duplicate",
  "bad_deadline",
  "invalid_tags",
  "not_renewable",
  "not_editable",
] as const;
export type OpportunityRuleCode = (typeof OPPORTUNITY_RULE_CODES)[number];
