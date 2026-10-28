import { describe, expect, it } from "vitest";

import type { IDirectoryEntry } from "@/features/directory/directory-schemas";

import { distanceLabel, formatDistance } from "./distance-label";

const SPLIT = { lat: 43.51, lng: 16.44 };
const ORIGIN = { point: SPLIT, showDistances: true };

function entry(kind: string, lat: number | null = 43.52) {
  return { kind, lat, lng: 16.44 } as IDirectoryEntry;
}

describe("formatDistance", () => {
  it("rounds by size", () => {
    expect(formatDistance(0.348, "en")).toBe("350 m");
    expect(formatDistance(4.23, "en")).toBe("4.2 km");
    expect(formatDistance(4.23, "hr")).toBe("4,2 km");
    expect(formatDistance(37.4, "en")).toBe("37 km");
  });
});

describe("distanceLabel", () => {
  it("shows the distance to an organisation", () => {
    expect(distanceLabel(entry("organization"), ORIGIN, "en")).toBe("1.1 km");
  });

  it("never shows a distance to a person, whose pin is offset", () => {
    expect(distanceLabel(entry("person"), ORIGIN, "en")).toBeNull();
  });

  it("shows nothing for a coarse origin or an entry without a pin", () => {
    const coarse = { ...ORIGIN, showDistances: false };
    expect(distanceLabel(entry("organization"), coarse, "en")).toBeNull();
    expect(distanceLabel(entry("organization", null), ORIGIN, "en")).toBeNull();
  });
});
