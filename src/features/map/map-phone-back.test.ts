import { describe, expect, it } from "vitest";

import { backReturnsToMap } from "./map-phone-back";

describe("backReturnsToMap", () => {
  it("steps back when the previous history entry is the map", () => {
    expect(backReturnsToMap(4, 5)).toBe(true);
  });

  it("navigates instead when the page was opened without the map before it", () => {
    expect(backReturnsToMap(null, 5)).toBe(false);
  });

  it("navigates instead when another page sits between the map and this one", () => {
    expect(backReturnsToMap(4, 6)).toBe(false);
  });
});
