export const HOUR_MS = 3_600_000;
export const DAY_MS = 24 * HOUR_MS;

export const CONTACT_MESSAGE_MAX = 1000;
export const CONTACT_MAX_LINKS = 1;
export const CONTACT_NAME_MAX = 120;

// Faster than this is a script, not a person writing a message.
export const CONTACT_MIN_FILL_MS = 2000;

export const CONTACT_LIMITS = {
  perSenderPerHour: 3,
  perEntryPerDay: 5,
  perSitePerDay: 60,
  perIpPerHour: 10,
} as const;

// Matches the 30 day retention promised in the privacy policy.
export const CONTACT_HASH_RETENTION_DAYS = 30;
// The relayed text lives in the job payload until the mail is out; finished jobs are wiped after this.
export const CONTACT_JOB_RETENTION_HOURS = 24;
