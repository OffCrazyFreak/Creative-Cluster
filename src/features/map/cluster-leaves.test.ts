import { describe, expect, it } from "vitest";

import { fitPadding, isSameSpot, leafBounds, toLeaf } from "./cluster-leaves";

function leaf(slug: string, lng: number, lat: number) {
  return { slug, lng, lat, person: false };
}

describe("isSameSpot", () => {
  it("treats entries within a few metres as one spot", () => {
    expect(
      isSameSpot([
        leaf("studio", 15.9681, 45.7754),
        leaf("lab", 15.9681, 45.7754),
        leaf("hub", 15.96815, 45.77548),
      ]),
    ).toBe(true);
  });

  it("keeps entries a street apart separate", () => {
    expect(
      isSameSpot([
        leaf("studio", 15.9681, 45.7754),
        leaf("lab", 15.9701, 45.7754),
      ]),
    ).toBe(false);
  });
});

describe("leafBounds", () => {
  it("spans every entry", () => {
    expect(leafBounds([leaf("a", 16, 45.9), leaf("b", 15.9, 45.8)])).toEqual([
      [15.9, 45.8],
      [16, 45.9],
    ]);
  });
});

describe("toLeaf", () => {
  it("reads the slug, the point and whether it is a person", () => {
    expect(
      toLeaf({
        geometry: { type: "Point", coordinates: [15, 45] },
        properties: { slug: "ana", person: true },
      }),
    ).toEqual({ slug: "ana", lng: 15, lat: 45, person: true });
  });

  it("skips a feature without a slug", () => {
    expect(
      toLeaf({
        geometry: { type: "Point", coordinates: [15, 45] },
        properties: {},
      }),
    ).toBeNull();
  });
});

describe("fitPadding", () => {
  const none = { top: 0, right: 0, bottom: 0, left: 0 };

  it("keeps a 64 px margin where there is room", () => {
    expect(fitPadding(800, 600, none)).toEqual({
      top: 64,
      right: 64,
      bottom: 64,
      left: 64,
    });
  });

  it("keeps the side panel clear on desktop", () => {
    expect(fitPadding(1280, 800, { ...none, left: 400 }).left).toBe(464);
  });

  it("fits inside a short map with the sheet up", () => {
    // A phone in landscape: 230 px of map, 126 px of it under the sheet.
    const padding = fitPadding(700, 230, { ...none, bottom: 126 });
    expect(padding.top + padding.bottom).toBeLessThan(230);
    expect(padding.bottom).toBeGreaterThan(126);
  });

  it("adds no margin when the panels already cover the whole height", () => {
    const padding = fitPadding(390, 300, { ...none, top: 120, bottom: 200 });
    expect(padding.top).toBe(120);
    expect(padding.bottom).toBe(200);
  });
});
