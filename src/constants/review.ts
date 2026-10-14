import { REVIEW_TYPES, type ReasonCode } from "./moderation";

export const REPORT_REASONS = [
  "inaccurate",
  "spam",
  "offensive",
  "illegal",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_MESSAGE_MAX = 500;
export const REVIEW_PAGE_SIZE = 25;
export const REVIEW_BULK_MAX = 50;
export const REVIEW_NOTE_MAX = 1000;

// Spam is dropped without telling the sender, so they learn nothing about what the filter caught.
export const SILENT_REASON_CODES: readonly ReasonCode[] = ["spam"];
// The free note is the whole explanation for "other".
export const NOTE_REQUIRED_REASON_CODES: readonly ReasonCode[] = ["other"];

// No code creates link disputes, so the queue filter leaves them out; the type stays in the database check.
export const QUEUE_REVIEW_TYPES = REVIEW_TYPES.filter(
  (type) => type !== "link_dispute",
);

export const REVIEW_AGE_FILTERS = ["all", "stale", "fresh"] as const;
export type ReviewAgeFilter = (typeof REVIEW_AGE_FILTERS)[number];

export const CHANGES_PAGE_SIZE = 30;
export const REVERT_REASON_MAX = 500;
// Identifiers removed from change_log rows after this many days and on erasure.
export const CHANGE_LOG_RETENTION_DAYS = 90;
export const CHANGE_LOG_PERSONAL_FIELDS = [
  "contactName",
  "contactEmail",
  "contactPhone",
  "addressText",
  "lat",
  "lng",
  "ownerUserId",
] as const;
