import type { StagingFile, StagingOrganization } from "./import-schemas";

export function org(
  legacyId: string,
  name: string,
  extra: Partial<StagingOrganization> = {},
): StagingOrganization {
  return {
    legacyId,
    name,
    description: "First paragraph.\nSecond paragraph.",
    website: `https://${legacyId}.example.com`,
    socials: {},
    contactName: "Fake Person",
    contactEmail: `${legacyId}@example.com`,
    contactPhone: "+000 000",
    location: {
      addressText: "Example Street 1",
      city: "Exampletown",
      countryCode: "HR",
      lat: null,
      lng: null,
      precision: null,
      source: null,
    },
    legalStatus: "Non-profit",
    references: "Worked with fake partners.",
    seekingText: "",
    topics: ["art"],
    ...extra,
  };
}

export const PINNED = {
  addressText: "Example Street 2",
  city: "Exampletown",
  countryCode: "HR",
  lat: 45.1,
  lng: 15.2,
  precision: "house",
  source: "manual",
} as const;

export function stagingFile(
  organizations: StagingOrganization[],
  site: StagingFile["site"] = "rpcc",
): StagingFile {
  return {
    version: 1,
    site,
    source: "test",
    exportedAt: new Date().toISOString(),
    organizations,
  };
}
