import { describe, expect, it } from "vitest";

import { resolveMapOrigin } from "./map-origin";

const ZAGREB = { lat: 45.81, lng: 15.98 };
const SPLIT_GPS = { lat: 43.51, lng: 16.44, accuracy: 30 };

describe("resolveMapOrigin", () => {
  it("prefers GPS over the IP guess and shows distances", () => {
    expect(resolveMapOrigin(SPLIT_GPS, ZAGREB)).toEqual({
      point: { lat: 43.51, lng: 16.44 },
      showDistances: true,
    });
  });

  it("hides distances for a fix coarser than 2 km", () => {
    const coarse = { ...SPLIT_GPS, accuracy: 3_000 };

    expect(resolveMapOrigin(coarse, null)?.showDistances).toBe(false);
  });

  it("sorts from the IP guess without distances when there is no GPS", () => {
    expect(resolveMapOrigin(null, ZAGREB)).toEqual({
      point: ZAGREB,
      showDistances: false,
    });
  });

  it("has no origin without GPS or a guess", () => {
    expect(resolveMapOrigin(null, null)).toBeNull();
  });
});
