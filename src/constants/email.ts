// Lower number is claimed first by the job drain.
export const EMAIL_PRIORITY = { urgent: 1, normal: 5 } as const;

export const EMAIL_TEMPLATE_NAMES = [
  "invite",
  "claim",
  "verify",
  "reset",
  "change",
] as const;
export type EmailTemplateName = (typeof EMAIL_TEMPLATE_NAMES)[number];

// Reset and verification mail must still go out when the day is nearly used up.
export const EMAIL_TEMPLATE_PRIORITY: Record<
  EmailTemplateName,
  keyof typeof EMAIL_PRIORITY
> = {
  invite: "urgent",
  claim: "normal",
  verify: "urgent",
  reset: "urgent",
  change: "urgent",
};

// Non-urgent mail waits for the next UTC day once this share of the cap is sent.
export const EMAIL_SOFT_CAP_RATIO = 0.8;

export const EMAIL_EXPIRY_KEYS = ["hour", "days7", "days30"] as const;
export type EmailExpiry = (typeof EMAIL_EXPIRY_KEYS)[number];

export const EMAIL_EXPIRY_SECONDS: Record<EmailExpiry, number> = {
  hour: 3600,
  days7: 7 * 24 * 3600,
  days30: 30 * 24 * 3600,
};

// The mail text and the token lifetime must agree, so each lifetime is one key plus this map.
export const AUTH_LINK_EXPIRY: EmailExpiry = "hour";
export const AUTH_LINK_TTL_SECONDS = EMAIL_EXPIRY_SECONDS[AUTH_LINK_EXPIRY];

export const INVITE_EXPIRY: EmailExpiry = "days7";
export const INVITE_TOKEN_TTL_SECONDS = EMAIL_EXPIRY_SECONDS[INVITE_EXPIRY];
