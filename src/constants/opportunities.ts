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

// closed_reason of a post its owner marked as filled.
export const OPPORTUNITY_FILLED_REASON = "filled";

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

// "Closing soon" filter: posts that end within this many days.
export const OPPORTUNITY_CLOSING_SOON_DAYS = 14;
export const OPPORTUNITY_LIST_MAX = 100;

export const OPPORTUNITY_REPORT_MESSAGE_MAX = 500;
