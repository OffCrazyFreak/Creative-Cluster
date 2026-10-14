import { emptyLocation } from "@/features/location";
import { EMPTY_RICH_TEXT } from "@/lib/rich-text/empty-rich-text";
import { site } from "@/sites";

import {
  APPLICANT_KINDS,
  type ApplicantKind,
  type ApplicationFormValues,
  type IFormDoc,
  type RejectedApplication,
} from "./apply-schemas";

// Outside partners are added by admins, never by an application.
export function applicantKinds(): ApplicantKind[] {
  return APPLICANT_KINDS.filter((kind) => site.entryKinds.includes(kind));
}

export function defaultCountry(): string | undefined {
  return site.id === "dnz" ? "HR" : undefined;
}

export function emptyApplication(): ApplicationFormValues {
  return {
    kind: applicantKinds()[0] ?? "organization",
    name: "",
    description: EMPTY_RICH_TEXT,
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    location: emptyLocation(defaultCountry() ?? null),
    consent: false,
    ageConfirmed: false,
  };
}

export function toFormValues(
  rejected: RejectedApplication,
): ApplicationFormValues {
  const { descriptionJson, ...rest } = rejected;
  return { ...rest, description: JSON.parse(descriptionJson) as IFormDoc };
}
