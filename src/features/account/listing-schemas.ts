import { z } from "zod";

import { LISTING_LIMITS, SOCIAL_PLATFORMS } from "@/constants/account";
import { FIELD_VISIBILITIES } from "@/constants/entry";
import { IMAGE_ALT_MAX_LENGTH } from "@/constants/images";
import { LOCALES } from "@/constants/locales";
import { MAX_TAGS_PER_FIELD, TAG_FIELDS } from "@/constants/tags";
import { VISIBILITY_FIELDS } from "@/features/entry/entry-visibility";
import { locationValueSchema } from "@/features/location/location-schemas";
import { richTextInput } from "@/lib/rich-text/rich-text-input";
import { m } from "@/paraglide/messages";
import { normalizeHttpUrl } from "@/utils/http-url";

const L = LISTING_LIMITS;

function plain(max: number) {
  return z
    .string()
    .trim()
    .max(max, { error: () => m.account_error_too_long({ max }) });
}

// Empty is allowed; a bare domain is accepted and stored as https://domain.
const optionalUrl = plain(L.url).refine(
  (value) => value === "" || normalizeHttpUrl(value) !== null,
  { error: () => m.account_error_url() },
);

const optionalEmail = plain(L.contactEmail).refine(
  (value) => value === "" || z.email().safeParse(value).success,
  { error: () => m.account_error_email() },
);

const optionalPhone = plain(30).refine(
  (value) => value === "" || /^\+?[\d\s()./-]{5,30}$/.test(value),
  { error: () => m.account_error_phone() },
);

const imageValue = z
  .object({
    id: z.uuid(),
    hash: z.string().regex(/^[0-9a-f]{64}$/),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    altText: z.string().trim().max(IMAGE_ALT_MAX_LENGTH),
  })
  .nullable();

const nonEmptyRichText = richTextInput(L.description).refine(
  (parsed) => parsed.text.length > 0,
  { error: () => m.account_error_description() },
);

export const listingSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { error: () => m.account_error_name() })
      .max(L.name, { error: () => m.account_error_name() }),
    sourceLocale: z.enum(LOCALES),
    description: nonEmptyRichText,
    offeringText: plain(L.offering),
    seekingText: plain(L.seeking),
    website: optionalUrl,
    socials: z.record(z.enum(SOCIAL_PLATFORMS), optionalUrl),
    contactName: plain(L.contactName),
    contactEmail: optionalEmail,
    contactPhone: optionalPhone,
    visibility: z.record(z.enum(VISIBILITY_FIELDS), z.enum(FIELD_VISIBILITIES)),
    location: locationValueSchema,
    logo: imageValue,
    cover: imageValue,
    tags: z.record(
      z.enum(TAG_FIELDS),
      z.array(z.uuid()).max(MAX_TAGS_PER_FIELD),
    ),
    legalStatus: plain(L.legalStatus),
    references: richTextInput(L.references),
    matchingOptOut: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.location.onlineOnly) return;
    if (!value.location.countryCode) {
      ctx.addIssue({
        code: "custom",
        path: ["location", "countryCode"],
        message: m.account_error_location_country(),
      });
    }
    if (!value.location.city) {
      ctx.addIssue({
        code: "custom",
        path: ["location", "city"],
        message: m.account_error_location_city(),
      });
    }
  });

// What the form holds (rich text as editor JSON) and what the server receives after parsing.
export type ListingFormValues = z.input<typeof listingSchema>;
export type ListingInput = z.output<typeof listingSchema>;

export const saveListingInput = z.object({
  entryId: z.uuid(),
  values: listingSchema,
});
