import { describe, expect, it } from "vitest";

import type { IDirectoryEntry } from "@/features/directory/directory-schemas";

import { ARC_POINTS, buildArcs } from "./map-arcs";

function entry(slug: string, lat: number | null, lng: number | null) {
  return { slug, lat, lng } as IDirectoryEntry;
}

describe("buildArcs", () => {
  const zagreb = entry("zagreb", 45.81, 15.98);

  it("draws one great-circle line of the configured size per partner", () => {
    const { features } = buildArcs(zagreb, [entry("oslo", 59.91, 10.75)]);
    expect(features).toHaveLength(1);
    const geometry = features[0].geometry;
    expect(geometry.type).toBe("LineString");
    if (geometry.type === "LineString")
      expect(geometry.coordinates.length).toBeGreaterThanOrEqual(32);
    expect(ARC_POINTS).toBeLessThanOrEqual(48);
  });

  it("skips partners at the same coordinates or without coordinates", () => {
    const { features } = buildArcs(zagreb, [
      entry("neighbour", 45.81, 15.98),
      entry("online", null, null),
      entry("split", 43.51, 16.44),
    ]);
    expect(features).toHaveLength(1);
  });

  it("draws nothing when the selected entry has no pin", () => {
    expect(
      buildArcs(entry("online", null, null), [zagreb]).features,
    ).toHaveLength(0);
  });
});
