import { describe, expect, it } from "vitest";

import { canSeeField } from "./entry-visibility";
import { redactEntry, type IEntryRow } from "./redact-entry";

function row(patch: Partial<IEntryRow> = {}): IEntryRow {
  return {
    id: "1",
    slug: "demo",
    kind: "organization",
    name: "Demo",
    sourceLocale: "en",
    descriptionText: "text",
    offeringText: "",
    seekingText: "",
    website: "https://example.org",
    socials: { instagram: "https://example.com/x" },
    contactName: "Contact",
    contactEmail: "a@example.com",
    contactPhone: "+385 1",
    contactEmailInvalid: false,
    extra: { legal_status: "Cooperative" },
    publishedAt: null,
    updatedAt: new Date("2026-01-01"),
    lastConfirmedAt: null,
    onlineOnly: false,
    city: "Zagreb",
    countryCode: "hr",
    addressText: "Example Street 1",
    lat: 45.81234,
    lng: 15.98765,
    locationDisplay: "exact",
    visibility: {},
    ...patch,
  };
}

describe("field visibility", () => {
  it("defaults a missing key to members and treats junk as hidden", () => {
    expect(canSeeField({}, "contactEmail", false)).toBe(false);
    expect(canSeeField({}, "contactEmail", true)).toBe(true);
    expect(canSeeField({ contactEmail: "bogus" }, "contactEmail", true)).toBe(
      false,
    );
    expect(canSeeField({ contactEmail: "public" }, "contactEmail", false)).toBe(
      true,
    );
    expect(canSeeField({ contactEmail: "hidden" }, "contactEmail", true)).toBe(
      false,
    );
  });
});

describe("redactEntry", () => {
  it("hides members-only fields from visitors and shows them to members", () => {
    const visitor = redactEntry(
      row({ visibility: { website: "public" } }),
      [],
      false,
    );
    expect(visitor.website).toBe("https://example.org");
    expect(visitor.contactEmail).toBeNull();
    expect(visitor.contactPhone).toBeNull();
    expect(visitor.socials).toEqual({});
    expect(visitor.hasContactChannel).toBe(true);

    const member = redactEntry(
      row({ visibility: { website: "public" } }),
      [],
      true,
    );
    expect(member.contactEmail).toBe("a@example.com");
    expect(member.legalStatus).toBe("Cooperative");
  });

  it("never exposes the address of a town-level entry and rounds its pin", () => {
    const entry = redactEntry(
      row({ locationDisplay: "town", visibility: { address: "public" } }),
      [],
      true,
    );
    expect(entry.location.addressText).toBeNull();
    expect(entry.location.lat).toBe(45.81);
    expect(entry.location.lng).toBe(15.99);
    expect(entry.location.countryCode).toBe("HR");
  });

  it("offers no contact channel when the address bounced", () => {
    const entry = redactEntry(row({ contactEmailInvalid: true }), [], false);
    expect(entry.hasContactChannel).toBe(false);
  });

  it("rounds the pin of an exact entry whose address the viewer may not see", () => {
    const hidden = redactEntry(
      row({ visibility: { address: "hidden" } }),
      [],
      true,
    );
    expect(hidden.location.addressText).toBeNull();
    expect(hidden.location.lat).toBe(45.81);
    const open = redactEntry(
      row({ visibility: { address: "public" } }),
      [],
      false,
    );
    expect(open.location.addressText).toBe("Example Street 1");
    expect(open.location.lat).toBe(45.81234);
  });

  it("treats people as town-level and online-only entries as pinless", () => {
    const person = redactEntry(
      row({ kind: "person", visibility: { address: "public" } }),
      [],
      true,
    );
    expect(person.location.addressText).toBeNull();
    expect(person.location.lat).toBe(45.81234);
    const online = redactEntry(row({ onlineOnly: true }), [], false);
    expect(online.location.lat).toBeNull();
  });
});
