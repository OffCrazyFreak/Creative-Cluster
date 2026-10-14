export const PUBLIC_LEGAL_PAGES = [
  "privacy",
  "terms",
  "imprint",
  "accessibility",
  "about",
  "help-owner",
] as const;

export type PublicLegalPage = (typeof PUBLIC_LEGAL_PAGES)[number];
export type LegalPage = PublicLegalPage | "help-admin";
