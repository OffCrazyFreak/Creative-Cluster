export const REVIEW_TYPES = [
  "application",
  "untrusted_edit",
  "opportunity",
  "tag",
  "report",
  "link_dispute",
] as const;
export type ReviewType = (typeof REVIEW_TYPES)[number];

export const REVIEW_STATUSES = [
  "open",
  "approved",
  "rejected",
  "dismissed",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REASON_CODES = [
  "incomplete",
  "duplicate",
  "out_of_scope",
  "unverifiable",
  "spam",
  "other",
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export const CHANGE_SOURCES = ["owner", "admin", "import", "system"] as const;
export type ChangeSource = (typeof CHANGE_SOURCES)[number];

export const CHANGE_ACTIONS = [
  "create",
  "update",
  "status_change",
  "revert",
  "delete",
] as const;
export type ChangeAction = (typeof CHANGE_ACTIONS)[number];

export const REVIEW_STALE_DAYS = 7;

export const MODERATED_ENTITIES = [
  "entry",
  "opportunity",
  "link",
  "tag",
  "user",
] as const;
export type ModeratedEntity = (typeof MODERATED_ENTITIES)[number];
