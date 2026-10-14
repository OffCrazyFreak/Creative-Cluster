import { describe, expect, it } from "vitest";

import { stagingFileSchema, stagingOrganizationSchema } from "./import-schemas";
import {
  guessCountryCode,
  legacyOrganizationSchema,
  mapLegacyOrganization,
} from "./legacy-map";

const fake = legacyOrganizationSchema.parse({
  id: 7,
  name: "  Example Studio ",
  description: "Line one.\nLine two.",
  contactName: "Fake Person",
  contactEmail: " Hello@Example.com ",
  contactTel: "+000 000",
  references: null,
  lookingFor: "A partner",
  address: "Example Street 1, Exampletown",
  webUrl: "example.com",
  instagramUrl: "https://instagram.com/example",
  facebookUrl: "javascript:alert(1)",
  twitterUrl: null,
  linkedInUrl: "",
  legalStatus: "Non-profit",
  workDomainIncludesArt: true,
  workDomainIncludesCrafts: false,
  workDomainIncludesEcology: true,
  workDomainIncludesScience: null,
  workDomainIncludesTechnology: false,
  somethingNew: "ignored",
});

describe("mapLegacyOrganization", () => {
  const mapped = mapLegacyOrganization(fake);

  it("maps the old fields onto the staging shape", () => {
    expect(mapped).toMatchObject({
      legacyId: "7",
      name: "Example Studio",
      website: "https://example.com",
      contactEmail: "hello@example.com",
      contactPhone: "+000 000",
      legalStatus: "Non-profit",
      seekingText: "A partner",
      topics: ["art", "ecology"],
      location: { addressText: "Example Street 1, Exampletown", lat: null },
    });
  });

  it("keeps only http(s) social links", () => {
    expect(mapped.socials).toEqual({
      instagram: "https://instagram.com/example",
    });
  });

  it("produces a valid staging organization", () => {
    expect(stagingOrganizationSchema.safeParse(mapped).success).toBe(true);
  });
});

describe("guessCountryCode", () => {
  it("reads a country name from the end of the address", () => {
    expect(
      guessCountryCode("Example Street 1, 10117 Exampletown, Germany"),
    ).toBe("DE");
    expect(guessCountryCode("Example Street 1, Exampletown")).toBeNull();
  });
});

describe("staging file", () => {
  it("rejects duplicate legacy ids", () => {
    const row = mapLegacyOrganization(fake);
    const result = stagingFileSchema.safeParse({
      version: 1,
      site: "rpcc",
      source: "test",
      exportedAt: new Date().toISOString(),
      organizations: [row, row],
    });
    expect(result.success).toBe(false);
  });

  it("knows common spellings of country names", () => {
    expect(guessCountryCode("Example Street 1, Czech Republic")).toBe("CZ");
    expect(guessCountryCode("Example Street 1, Bosnia and Herzegovina")).toBe(
      "BA",
    );
  });
});
