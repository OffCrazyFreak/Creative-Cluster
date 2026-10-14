import { describe, expect, it } from "vitest";

import { searchTowns } from "../../src/features/location/town-search";
import type { ITown } from "../../src/features/location/town-types";
import { normalizeSearch } from "../../src/utils/normalize-search";

function town(name: string, population: number): ITown {
  return { name, lat: 0, lng: 0, population, countryCode: "HR" };
}
const TOWNS = [
  town("Zagreb", 700000),
  town("Županja", 12000),
  town("Đakovo", 20000),
  town("Nova Gradiška", 12000),
];

describe("diacritics-insensitive search", () => {
  it("finds Županja typed as zupanja", () => {
    expect(searchTowns(TOWNS, "zupanja").map((t) => t.name)).toEqual([
      "Županja",
    ]);
  });

  it("maps đ to d and matches word starts", () => {
    expect(searchTowns(TOWNS, "dakovo")[0]?.name).toBe("Đakovo");
    expect(searchTowns(TOWNS, "gradiska")[0]?.name).toBe("Nova Gradiška");
  });

  it("normalises names for the DGU search text", () => {
    expect(normalizeSearch("Šetalište Đure Đakovića 3/A")).toBe(
      "setaliste dure dakovica 3 a",
    );
  });
});

describe("generated GeoNames file", () => {
  it("has Croatian towns and finds Županja for zupanja", async () => {
    const { readFileSync } = await import("node:fs");
    const rows = JSON.parse(
      readFileSync("public/geo/towns-HR.json", "utf8"),
    ) as [string, number, number, number][];
    const towns = rows.map(([name, lat, lng, population]) => ({
      name,
      lat,
      lng,
      population,
      countryCode: "HR",
    }));
    expect(towns.length).toBeGreaterThan(1000);
    expect(searchTowns(towns, "zupanja")[0]?.name).toBe("Županja");
  });
});
