import { describe, expect, it } from "vitest";

import {
  emptyLocation,
  locationValueSchema,
} from "../../src/features/location/location-schemas";
import {
  valueFromHit,
  valueFromTown,
  valueWithPin,
} from "../../src/features/location/location-value";
import { parseAddressQuery } from "../../src/lib/geocoding/dgu/parse-query";
import type { GeoHit } from "../../src/lib/geocoding/types";

const HIT: GeoHit = {
  label: "Pred Dvorom 3",
  secondary: "20000 Dubrovnik",
  lat: 42.64,
  lng: 18.11,
  city: "Dubrovnik",
  countryCode: "HR",
  precision: "house",
  source: "dgu",
};

describe("location value", () => {
  it("a hit fills coordinates, precision and source", () => {
    const value = valueFromHit(emptyLocation("HR"), HIT);
    expect(value).toMatchObject({
      lat: 42.64,
      source: "dgu",
      precision: "house",
      pinMovedByHand: false,
    });
    expect(locationValueSchema.safeParse(value).success).toBe(true);
  });

  it("a pin moved by hand survives a new address search", () => {
    const moved = valueWithPin(
      valueFromHit(emptyLocation("HR"), HIT),
      { lat: 42.7, lng: 18.2 },
      true,
    );
    expect(moved).toMatchObject({ pinMovedByHand: true, source: "manual" });
    const again = valueFromHit(moved, {
      ...HIT,
      label: "Other 9",
      lat: 1,
      lng: 2,
    });
    expect(again).toMatchObject({
      lat: 42.7,
      lng: 18.2,
      pinMovedByHand: true,
      addressText: "Other 9, 20000 Dubrovnik",
    });
  });

  it("a town pick is town level with a town display", () => {
    const value = valueFromTown(emptyLocation(), {
      name: "Županja",
      lat: 45.07,
      lng: 18.69,
      population: 12000,
      countryCode: "HR",
    });
    expect(value).toMatchObject({
      precision: "town",
      source: "town_list",
      display: "town",
    });
  });

  it("lat without lng is rejected", () => {
    expect(
      locationValueSchema.safeParse({ ...emptyLocation(), lat: 1 }).success,
    ).toBe(false);
  });
});

describe("DGU query parsing", () => {
  it("splits street, number, suffix and place", () => {
    expect(parseAddressQuery("Pred Dvorom 3a Dubrovnik")).toEqual({
      streetWords: ["pred", "dvorom"],
      houseNumber: 3,
      suffix: "A",
      placeWords: ["dubrovnik"],
    });
  });

  it("does not take a postcode for a house number", () => {
    expect(parseAddressQuery("Ilica 10000 Zagreb").houseNumber).toBeNull();
  });
});

describe("DGU query parsing of sub-addresses", () => {
  it("keeps a slash part and a letter plus slash part", () => {
    expect(parseAddressQuery("Ilica 69/7 Zagreb")).toMatchObject({
      houseNumber: 69,
      suffix: "/7",
      placeWords: ["zagreb"],
    });
    expect(parseAddressQuery("Kaniška ulica 105a/1 Gospić")).toMatchObject({
      houseNumber: 105,
      suffix: "A/1",
    });
  });
});
