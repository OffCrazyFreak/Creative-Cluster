export const IMPORT_WARNING_CODES = [
  "no_email",
  "bad_email",
  "no_pin",
  "town_pin",
  "no_website",
  "unknown_tag",
] as const;
export type ImportWarningCode = (typeof IMPORT_WARNING_CODES)[number];

export const IMPORT_DUPLICATE_REASONS = [
  "existing_name",
  "existing_website",
  "file_name",
  "file_website",
] as const;
export type ImportDuplicateReason = (typeof IMPORT_DUPLICATE_REASONS)[number];

// Console wording for the script; the admin page uses translated messages.
export const WARNING_TEXT: Record<ImportWarningCode, string> = {
  no_email: "no contact email",
  bad_email: "contact email looks invalid",
  no_pin: "no pin yet",
  town_pin: "pin is town level",
  no_website: "no website",
  unknown_tag: "topic tag is not seeded",
};

export const DUPLICATE_TEXT: Record<ImportDuplicateReason, string> = {
  existing_name: "same name as an existing listing",
  existing_website: "same website as an existing listing",
  file_name: "same name earlier in this file",
  file_website: "same website earlier in this file",
};

export interface IImportWarning {
  legacyId: string;
  name: string;
  code: ImportWarningCode;
  // The tag slug for unknown_tag.
  detail?: string;
}

export interface IImportDuplicate {
  legacyId: string;
  name: string;
  reason: ImportDuplicateReason;
  // The name of the existing listing, when there is one.
  other?: string;
}

export interface IImportPlan {
  total: number;
  toCreate: string[];
  alreadyImported: string[];
  duplicates: IImportDuplicate[];
  warnings: IImportWarning[];
}

export type ImportFileError = "invalid_json" | "invalid_file" | "wrong_site";
