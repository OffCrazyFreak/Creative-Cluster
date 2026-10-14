import { EMAIL_EXPIRY_SECONDS, type EmailExpiry } from "./email";

// Quicker than this is a script, not a person filling in a form.
export const APPLY_MIN_FILL_SECONDS = 5;
export const APPLY_NAME_MAX = 120;
export const APPLY_DESCRIPTION_MAX_CHARS = 2000;
export const APPLY_CONTACT_MAX = 200;
export const APPLY_MIN_AGE = 16;

// Bump when the wording of the person consent text changes; entry.consent_version stores it.
export const CONSENT_TEXT_VERSION = "2026-10-v1";

export const APPLY_VERIFY_EXPIRY: EmailExpiry = "days7";
export const APPLY_VERIFY_TTL_SECONDS =
  EMAIL_EXPIRY_SECONDS[APPLY_VERIFY_EXPIRY];

// A rejected application stays editable this long, then the purge job deletes it.
export const REJECTED_APPLICATION_RETENTION_DAYS = 90;
export const REJECTED_EDIT_TTL_SECONDS =
  REJECTED_APPLICATION_RETENTION_DAYS * 24 * 3600;

export const APPLY_DRAFT_STORAGE_KEY = "cc-apply-draft";
