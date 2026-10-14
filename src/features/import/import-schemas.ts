import { z } from "zod";

import { SOCIAL_PLATFORMS, LISTING_LIMITS } from "@/constants/account";
import { LOCATION_PRECISIONS, LOCATION_SOURCES } from "@/constants/entry";
import { LEGACY_DOMAIN_TAGS, STAGING_VERSION } from "@/constants/import";
import { SITE_IDS } from "@/sites/site-id";

const L = LISTING_LIMITS;

function text(max: number) {
  return z.string().trim().max(max).default("");
}

const locationSchema = z.object({
  addressText: text(300),
  city: z.string().trim().max(120).nullable().default(null),
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .nullable()
    .default(null),
  lat: z.number().min(-90).max(90).nullable().default(null),
  lng: z.number().min(-180).max(180).nullable().default(null),
  precision: z.enum(LOCATION_PRECISIONS).nullable().default(null),
  source: z.enum(LOCATION_SOURCES).nullable().default(null),
});

export const stagingOrganizationSchema = z.object({
  legacyId: z.string().trim().min(1).max(80),
  name: z.string().trim().min(2).max(L.name),
  description: z.string().trim().min(1).max(L.description),
  website: text(L.url),
  socials: z
    .partialRecord(z.enum(SOCIAL_PLATFORMS), z.string().max(L.url))
    .default({}),
  contactName: text(L.contactName),
  contactEmail: text(L.contactEmail),
  contactPhone: text(30),
  location: locationSchema,
  legalStatus: text(L.legalStatus),
  references: text(L.references),
  seekingText: text(L.seeking),
  topics: z.array(z.enum(LEGACY_DOMAIN_TAGS)).max(5).default([]),
});
export type StagingOrganization = z.infer<typeof stagingOrganizationSchema>;

export const stagingFileSchema = z.object({
  version: z.literal(STAGING_VERSION),
  site: z.enum(SITE_IDS),
  source: z.string().trim().min(1).max(200),
  exportedAt: z.iso.datetime(),
  organizations: z.array(stagingOrganizationSchema).max(2000),
});
export type StagingFile = z.infer<typeof stagingFileSchema>;
