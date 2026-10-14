import { describe, expect, it } from "vitest";

import {
  geoapifyPrecision,
  nominatimPrecision,
  photonPrecision,
} from "../../src/lib/geocoding/precision";

describe("precision mapping", () => {
  it.each([
    [30, "house"],
    [26, "house"],
    [25, "street"],
    [22, "street"],
    [21, "town"],
    [16, "town"],
    [15, null],
  ])("nominatim place_rank %i", (rank, expected) => {
    expect(nominatimPrecision(rank)).toBe(expected);
  });

  it("photon: layers map and unwanted OSM objects are rejected", () => {
    expect(photonPrecision({ type: "house" })).toBe("house");
    expect(photonPrecision({ type: "street" })).toBe("street");
    expect(photonPrecision({ type: "city" })).toBe("town");
    expect(photonPrecision({ type: "country" })).toBeNull();
    expect(photonPrecision({ type: "house", osm_key: "waterway" })).toBeNull();
    expect(
      photonPrecision({ type: "locality", osm_key: "natural" }),
    ).toBeNull();
    expect(
      photonPrecision({
        type: "house",
        osm_key: "highway",
        osm_value: "bus_stop",
      }),
    ).toBeNull();
  });

  it("geoapify: result_type with building confidence", () => {
    expect(
      geoapifyPrecision({
        result_type: "building",
        rank: { confidence_building_level: 1 },
      }),
    ).toBe("house");
    expect(
      geoapifyPrecision({
        result_type: "building",
        rank: { confidence_building_level: 0.2 },
      }),
    ).toBe("street");
    expect(
      geoapifyPrecision({ result_type: "amenity", housenumber: "3" }),
    ).toBe("house");
    expect(geoapifyPrecision({ result_type: "street" })).toBe("street");
    expect(geoapifyPrecision({ result_type: "postcode" })).toBe("town");
    expect(geoapifyPrecision({ result_type: "country" })).toBeNull();
  });
});
