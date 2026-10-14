import { describe, expect, it } from "vitest";

import { laeaPosToLonLat } from "../../scripts/dgu/project";

describe("EPSG:3035 reprojection", () => {
  it("reads gml:pos northing first", () => {
    // First DGU address in the 2026-10-11 zip (Oroslavje); read as x,y it would land at lon -25.
    const { lon, lat } = laeaPosToLonLat("2561799.19395499 4781765.61686003");
    expect(lon).toBeCloseTo(15.9483, 3);
    expect(lat).toBeCloseTo(46.0033, 3);
  });
});
