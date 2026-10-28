import { describe, expect, it } from "vitest";

import type { IDirectoryEntry } from "@/features/directory/directory-schemas";

import { buildGeoJson, buildSlugIds } from "./map-geojson";

function entry(slug: string, opps: number): IDirectoryEntry {
  return {
    slug,
    name: slug,
    kind: "organization",
    lat: 45,
    lng: 15,
    city: null,
    country: "HR",
    legal: null,
    logo: null,
    blurb: "",
    tags: [],
    opps,
  };
}

describe("buildGeoJson", () => {
  it("carries the opportunity count on each pin so the layer can badge it", () => {
    const entries = [entry("a", 2), entry("b", 0)];
    const json = buildGeoJson(entries, buildSlugIds(entries));
    expect(
      json.features.map((f) => (f.properties as { opps: number }).opps),
    ).toEqual([2, 0]);
  });

  it("names a logo tile when the entry has a logo, else an initials tile", () => {
    const withLogo = { ...entry("a", 0), logo: { id: "i", hash: "h" } };
    const entries = [withLogo, entry("b", 0)];
    const json = buildGeoJson(entries, buildSlugIds(entries));
    expect(
      json.features.map((f) => (f.properties as { icon: string }).icon),
    ).toEqual(["entry:A:i:h", "entry:B"]);
  });
});
