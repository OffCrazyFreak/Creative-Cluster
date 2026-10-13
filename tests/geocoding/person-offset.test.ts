import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/env.server", () => ({
  env: { PSEUDONYM_SECRET: "test-secret-test-secret-test-secret-00" },
}));

import {
  offsetPin,
  offsetRadiusKm,
} from "../../src/features/location/person-offset.server";
import { emptyLocation } from "../../src/features/location/location-schemas";
import { applyPersonOffset } from "../../src/features/location/person-offset-fn.server";
import { haversineMeters } from "../../src/utils/geo";

const SECRET = "test-secret-test-secret-test-secret-00";
const ZUPANJA = { lat: 45.0786, lng: 18.6989, population: 12000 };

describe("person pin offset", () => {
  it("is deterministic for the same entry and secret", () => {
    expect(offsetPin("entry-1", ZUPANJA, SECRET)).toEqual(
      offsetPin("entry-1", ZUPANJA, SECRET),
    );
  });

  it("differs by entry id and by secret", () => {
    const a = offsetPin("entry-1", ZUPANJA, SECRET);
    expect(offsetPin("entry-2", ZUPANJA, SECRET)).not.toEqual(a);
    expect(offsetPin("entry-1", ZUPANJA, `${SECRET}x`)).not.toEqual(a);
  });

  it("stays inside the disc and never lands on the town centre", () => {
    for (let i = 0; i < 500; i++) {
      const pin = offsetPin(`entry-${i}`, ZUPANJA, SECRET);
      const meters = haversineMeters(ZUPANJA, pin);
      expect(meters).toBeLessThanOrEqual(
        offsetRadiusKm(ZUPANJA.population) * 1000 + 1,
      );
    }
  });

  it("radius is 1 to 4 km", () => {
    expect(offsetRadiusKm(500)).toBe(1);
    expect(offsetRadiusKm(12_000)).toBe(1);
    expect(offsetRadiusKm(5_000_000)).toBe(4);
  });
});

describe("applyPersonOffset", () => {
  const fresh = {
    ...emptyLocation("HR"),
    lat: 45.0786,
    lng: 18.6989,
    city: "Županja",
    precision: "town" as const,
    source: "town_list" as const,
    display: "town" as const,
    townPopulation: 12000,
  };

  it("offsets a fresh town pick and drops the transient population", () => {
    const stored = applyPersonOffset("entry-1", fresh);
    expect(stored.townPopulation).toBeUndefined();
    expect(
      haversineMeters(
        fresh as { lat: number; lng: number },
        stored as { lat: number; lng: number },
      ),
    ).toBeGreaterThan(0);
  });

  it("leaves a value read back from the database alone, so a re-save never drifts", () => {
    const stored = applyPersonOffset("entry-1", fresh);
    expect(applyPersonOffset("entry-1", stored)).toEqual(stored);
  });

  it("never stores an exact pin for a person", () => {
    const exact = { ...fresh, source: "dgu" as const, townPopulation: null };
    expect(applyPersonOffset("entry-1", exact)).toMatchObject({
      lat: null,
      lng: null,
      source: null,
    });
  });
});
