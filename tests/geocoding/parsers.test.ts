import { describe, expect, it } from "vitest";

import { parseGeoapify } from "../../src/lib/geocoding/geoapify";
import { parseNominatim } from "../../src/lib/geocoding/nominatim";
import { parsePhoton } from "../../src/lib/geocoding/photon";

describe("provider parsers", () => {
  it("photon drops hits from the wrong country and bus stops", () => {
    function feature(props: object, coords: [number, number]) {
      return { geometry: { coordinates: coords }, properties: props };
    }
    const body = {
      features: [
        feature(
          {
            type: "house",
            street: "Strossmayerova",
            housenumber: "15",
            city: "Selca",
            countrycode: "HR",
          },
          [16.8, 43.3],
        ),
        feature(
          {
            type: "house",
            street: "Strossmayerova",
            housenumber: "15",
            city: "Graz",
            countrycode: "AT",
          },
          [15.4, 47.0],
        ),
        feature(
          {
            type: "house",
            osm_key: "highway",
            osm_value: "bus_stop",
            name: "Autobusni kolodvor",
            countrycode: "HR",
          },
          [18.1, 42.6],
        ),
      ],
    };
    const hits = parsePhoton(body, "hr");
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      label: "Strossmayerova 15",
      countryCode: "HR",
      source: "photon",
      lat: 43.3,
      lng: 16.8,
    });
  });

  it("nominatim keeps coordinates, country and precision", () => {
    const hits = parseNominatim([
      {
        lat: "45.8125555",
        lon: "15.9652085",
        place_rank: 30,
        display_name: "69, Ilica, Zagreb, Hrvatska",
        address: {
          house_number: "69",
          road: "Ilica",
          city: "Zagreb",
          country_code: "hr",
        },
      },
      {
        lat: "1",
        lon: "1",
        place_rank: 8,
        display_name: "Hrvatska",
        address: { country_code: "hr" },
      },
    ]);
    expect(hits).toEqual([
      {
        label: "Ilica 69",
        secondary: "Zagreb",
        lat: 45.8125555,
        lng: 15.9652085,
        city: "Zagreb",
        countryCode: "HR",
        precision: "house",
        source: "nominatim",
      },
    ]);
  });

  it("geoapify maps lat/lon and result type", () => {
    const hits = parseGeoapify({
      results: [
        {
          lat: 42.64,
          lon: 18.11,
          address_line1: "Pred Dvorom 3",
          address_line2: "20000 Dubrovnik, Croatia",
          city: "Dubrovnik",
          country_code: "hr",
          result_type: "building",
          rank: { confidence_building_level: 1 },
        },
      ],
    });
    expect(hits[0]).toMatchObject({
      precision: "house",
      countryCode: "HR",
      source: "geoapify",
      lng: 18.11,
    });
  });

  it("an unexpected shape is an unavailable error, not a crash", () => {
    expect(() => parseGeoapify({ nope: true })).not.toThrow();
    expect(() => parseNominatim({ error: "x" })).toThrow();
  });
});
