import { describe, expect, it } from "vitest";

import type { IDirectoryEntry } from "@/features/directory/directory-schemas";

import { distanceKm, inBounds } from "./geo";
import { filterEntries, limitToBounds } from "./map-filters";
import {
  formatViewport,
  parsePoint,
  parseViewport,
  toFilters,
  mapSearchSchema,
} from "./map-search";
import { seededShuffle } from "./shuffle";

const tags = [
  { slug: "art", en: "Art", hr: "Umjetnost" },
  { slug: "ecology", en: "Ecology", hr: "Ekologija" },
];

function entry(
  slug: string,
  patch: Partial<IDirectoryEntry> = {},
): IDirectoryEntry {
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
    ...patch,
  };
}

const base = { tags, textMatches: null, seed: 1 };
const noFilters = {
  q: "",
  tags: [],
  country: "",
  legal: "",
  near: null,
  radiusKm: 0,
};

describe("filterEntries", () => {
  const entries = [
    entry("a", { tags: [0], country: "HR" }),
    entry("b", { tags: [1], country: "PT", legal: "Cooperative" }),
    entry("c", { tags: [0, 1], country: "PT", lat: null, lng: null }),
  ];

  it("matches any selected tag", () => {
    const out = filterEntries({
      ...base,
      entries,
      filters: { ...noFilters, tags: ["art"] },
    });
    expect(out.map((e) => e.slug).sort()).toEqual(["a", "c"]);
  });

  it("filters by country and legal status", () => {
    const out = filterEntries({
      ...base,
      entries,
      filters: { ...noFilters, country: "PT", legal: "Cooperative" },
    });
    expect(out.map((e) => e.slug)).toEqual(["b"]);
  });

  it("drops entries without a pin from a distance filter and sorts by distance", () => {
    const near = { lat: 45, lng: 15 };
    const out = filterEntries({
      ...base,
      entries: [
        entry("far", { lat: 46, lng: 15 }),
        entry("close", { lat: 45.01, lng: 15 }),
        entries[2],
      ],
      filters: { ...noFilters, near, radiusKm: 500 },
    });
    expect(out.map((e) => e.slug)).toEqual(["close", "far"]);
  });

  it("keeps text search order", () => {
    const out = filterEntries({
      ...base,
      entries,
      filters: noFilters,
      textMatches: ["c", "a"],
    });
    expect(out.map((e) => e.slug)).toEqual(["c", "a"]);
  });
});

describe("helpers", () => {
  it("shuffles deterministically per seed", () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    expect(seededShuffle(items, 7)).toEqual(seededShuffle(items, 7));
    expect(seededShuffle(items, 7)).not.toEqual(seededShuffle(items, 8));
    expect([...seededShuffle(items, 7)].sort((a, b) => a - b)).toEqual(items);
  });

  it("measures distance", () => {
    expect(
      distanceKm({ lat: 45.815, lng: 15.98 }, { lat: 43.508, lng: 16.44 }),
    ).toBeCloseTo(259, -1);
  });

  it("limits to bounds, including across the antimeridian", () => {
    const a = entry("a", { lat: 10, lng: 179 });
    expect(
      limitToBounds([a], { west: 170, south: 0, east: -170, north: 20 }),
    ).toHaveLength(1);
    expect(
      inBounds(
        { lat: 10, lng: 0 },
        { west: 170, south: 0, east: -170, north: 20 },
      ),
    ).toBe(false);
  });

  it("parses and formats the viewport param and rejects junk", () => {
    expect(parseViewport("45.1,15.2,7.5")).toEqual({
      lat: 45.1,
      lng: 15.2,
      zoom: 7.5,
    });
    expect(parseViewport("95,15,3")).toBeNull();
    expect(parseViewport("x,1,2")).toBeNull();
    expect(parseViewport(",,")).toBeNull();
    expect(parsePoint(" , ")).toBeNull();
    expect(parsePoint("1,2,3")).toBeNull();
    expect(formatViewport({ lat: 1, lng: 2, zoom: 3 })).toBe(
      "1.0000,2.0000,3.00",
    );
  });

  it("falls back to defaults for bad search params", () => {
    const search = mapSearchSchema.parse({
      q: 2024,
      tags: ["x"],
      radius: "abc",
      near: "1,2",
    });
    expect(search.q).toBe("2024");
    expect(search.tags).toBe("");
    expect(search.radius).toBe(0);
    expect(toFilters(search).near).toEqual({ lat: 1, lng: 2 });
    expect(toFilters(search).radiusKm).toBe(0);
    expect(
      toFilters(mapSearchSchema.parse({ country: "abc123" })).country,
    ).toBe("");
    expect(toFilters(mapSearchSchema.parse({ country: "hr" })).country).toBe(
      "HR",
    );
  });
});
