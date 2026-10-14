import { z } from "zod";

import type { SocialPlatform } from "@/constants/account";
import { LEGACY_DOMAIN_TAGS } from "@/constants/import";
import { normalizeHttpUrl } from "@/utils/http-url";

import type { StagingOrganization } from "./import-schemas";

const nullableText = z.string().nullish();
const flag = z.boolean().nullish();

// Only the fields the old Organization entity had; unknown keys are ignored.
export const legacyOrganizationSchema = z.object({
  id: z.union([z.number(), z.string()]),
  name: z.string(),
  description: nullableText,
  contactName: nullableText,
  contactEmail: nullableText,
  contactTel: nullableText,
  references: nullableText,
  lookingFor: nullableText,
  address: nullableText,
  webUrl: nullableText,
  instagramUrl: nullableText,
  facebookUrl: nullableText,
  twitterUrl: nullableText,
  linkedInUrl: nullableText,
  legalStatus: nullableText,
  workDomainIncludesArt: flag,
  workDomainIncludesCrafts: flag,
  workDomainIncludesEcology: flag,
  workDomainIncludesScience: flag,
  workDomainIncludesTechnology: flag,
});
export type LegacyOrganization = z.infer<typeof legacyOrganizationSchema>;

const SOCIAL_FIELDS = [
  ["instagram", "instagramUrl"],
  ["facebook", "facebookUrl"],
  ["linkedin", "linkedInUrl"],
  ["x", "twitterUrl"],
] as const satisfies readonly [SocialPlatform, keyof LegacyOrganization][];

const REGION_CODES = Array.from({ length: 26 * 26 }, (_, i) =>
  String.fromCharCode(65 + Math.floor(i / 26), 65 + (i % 26)),
);
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const countryByName = new Map<string, string>();
for (const code of REGION_CODES) {
  const name = regionNames.of(code);
  if (name && name !== code) countryByName.set(name.toLowerCase(), code);
}

// The old form asked for a free-text address; when its last part is a country name we can keep the country.
export function guessCountryCode(address: string): string | null {
  const last = address.split(",").at(-1)?.trim().toLowerCase();
  return (last && countryByName.get(last)) || null;
}

function clean(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function socialsOf(row: LegacyOrganization) {
  const socials: Partial<Record<SocialPlatform, string>> = {};
  for (const [platform, field] of SOCIAL_FIELDS) {
    const url = normalizeHttpUrl(clean(row[field]));
    if (url) socials[platform] = url;
  }
  return socials;
}

function topicsOf(row: LegacyOrganization) {
  const on: Record<
    (typeof LEGACY_DOMAIN_TAGS)[number],
    boolean | null | undefined
  > = {
    art: row.workDomainIncludesArt,
    crafts: row.workDomainIncludesCrafts,
    ecology: row.workDomainIncludesEcology,
    science: row.workDomainIncludesScience,
    technology: row.workDomainIncludesTechnology,
  };
  return LEGACY_DOMAIN_TAGS.filter((slug) => on[slug]);
}

// Location stays text here; the optional geocoding step fills coordinates.
export function mapLegacyOrganization(
  row: LegacyOrganization,
): StagingOrganization {
  return {
    legacyId: String(row.id),
    name: clean(row.name),
    description: clean(row.description),
    website: normalizeHttpUrl(clean(row.webUrl)) ?? "",
    socials: socialsOf(row),
    contactName: clean(row.contactName),
    contactEmail: clean(row.contactEmail).toLowerCase(),
    contactPhone: clean(row.contactTel),
    location: {
      addressText: clean(row.address),
      city: null,
      countryCode: guessCountryCode(clean(row.address)),
      lat: null,
      lng: null,
      precision: null,
      source: null,
    },
    legalStatus: clean(row.legalStatus),
    references: clean(row.references),
    seekingText: clean(row.lookingFor),
    topics: topicsOf(row),
  };
}
