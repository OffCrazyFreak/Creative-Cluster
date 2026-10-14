import { z } from "zod";

import {
  APPLY_CONTACT_MAX,
  APPLY_DESCRIPTION_MAX_CHARS,
  APPLY_NAME_MAX,
} from "@/constants/apply";
import { LOCALES } from "@/constants/locales";
import { locationValueSchema } from "@/features/location";
import type { IParsedRichText } from "@/lib/rich-text/parse-rich-text";
import { richTextInput } from "@/lib/rich-text/rich-text-input";
import { site } from "@/sites";
import { normalizeHttpUrl } from "@/utils/http-url";
import { m } from "@/paraglide/messages";

export const APPLICANT_KINDS = ["organization", "person"] as const;
export type ApplicantKind = (typeof APPLICANT_KINDS)[number];

// RichTextDoc is recursive, which overflows TanStack Form's field-key types; the server still parses the real shape.
export interface IFormDoc {
  type: "doc";
  content?: readonly unknown[];
}

function formRichText(maxChars: number) {
  return richTextInput(maxChars) as unknown as z.ZodType<
    IParsedRichText,
    IFormDoc
  >;
}

function required() {
  return { error: () => m.apply_required() };
}

const website = z
  .string()
  .trim()
  .max(APPLY_CONTACT_MAX)
  .transform((value, ctx) => {
    if (value === "") return null;
    const url = normalizeHttpUrl(value);
    if (!url) {
      ctx.addIssue({ code: "custom", message: m.apply_website_invalid() });
      return z.NEVER;
    }
    return url;
  });

// One shape for the browser form and the server, so a rule cannot drift between them.
export const applicationFieldsSchema = z.object({
  kind: z.enum(APPLICANT_KINDS),
  name: z.string().trim().min(2, required()).max(APPLY_NAME_MAX),
  description: formRichText(APPLY_DESCRIPTION_MAX_CHARS).refine(
    (parsed) => parsed.text.trim().length >= 20,
    { error: () => m.apply_description_short() },
  ),
  contactName: z.string().trim().max(APPLY_NAME_MAX),
  contactEmail: z.email({ error: () => m.apply_email_invalid() }),
  contactPhone: z.string().trim().max(40),
  website,
  location: locationValueSchema.refine(
    (value) => Boolean(value.countryCode) && Boolean(value.city),
    { error: () => m.apply_location_required() },
  ),
});

export const consentSchema = z.object({
  consent: z.boolean(),
  ageConfirmed: z.boolean(),
});

// The extra checks only apply to people: organizations publish business data and need no consent.
export function requireConsentForPeople(
  value: { kind: ApplicantKind; consent: boolean; ageConfirmed: boolean },
  ctx: z.RefinementCtx,
) {
  if (value.kind !== "person") return;
  if (!value.consent)
    ctx.addIssue({
      code: "custom",
      path: ["consent"],
      message: m.apply_consent_required(),
    });
  if (!value.ageConfirmed)
    ctx.addIssue({
      code: "custom",
      path: ["ageConfirmed"],
      message: m.apply_age_required(),
    });
}

// The form only offers this site's kinds; the server must not trust that.
export const applicationSchema = applicationFieldsSchema
  .extend(consentSchema.shape)
  .refine((value) => site.entryKinds.includes(value.kind), { path: ["kind"] })
  .superRefine(requireConsentForPeople);

export const submitApplicationSchema = z.object({
  application: applicationSchema,
  locale: z.enum(LOCALES),
  turnstileToken: z.string().min(1).max(4096),
  // Honeypot: real visitors never see or fill this field.
  nickname: z.string().max(200),
  startedAt: z.number().int(),
  // Present when a rejected application is sent again.
  resubmitToken: z.string().min(1).max(200).optional(),
});

export const similarNameSchema = z.object({
  name: z.string().trim().min(3).max(APPLY_NAME_MAX),
});

export const applicationTokenSchema = z.object({
  token: z.string().min(1).max(200),
});

export type ApplicationInput = z.output<typeof applicationSchema>;
export type ApplicationFormValues = z.input<typeof applicationSchema>;

// The edit link's payload: the description travels as a JSON string because ProseMirror attrs are typed unknown.
export type RejectedApplication = Omit<ApplicationFormValues, "description"> & {
  descriptionJson: string;
};

export interface ISimilarEntry {
  slug: string;
  name: string;
  city: string | null;
  claimable: boolean;
}

export type SubmitApplicationResult =
  | { status: "verify" }
  | { status: "received" }
  | { status: "captcha" }
  | { status: "limited" }
  | { status: "expired" };

export type VerifyApplicationResult =
  | { status: "verified"; entryName: string }
  | { status: "already"; entryName: string }
  | { status: "invalid" };
