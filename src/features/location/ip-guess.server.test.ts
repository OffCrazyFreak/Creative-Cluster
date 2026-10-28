import { getContext } from "@netlify/functions";
import { afterEach, describe, expect, it, vi } from "vitest";

import { readIpGuess } from "./ip-guess.server";

vi.mock("@netlify/functions", () => ({ getContext: vi.fn() }));

// The Netlify request context is a boundary the suite cannot run: each test decides its geo.
function withGeo(geo: Record<string, unknown> | undefined) {
  vi.mocked(getContext).mockReturnValue({ geo } as unknown as ReturnType<
    typeof getContext
  >);
}

describe("readIpGuess", () => {
  afterEach(() => vi.mocked(getContext).mockReset());

  it("rounds a guess inside the site's region to about a kilometre", () => {
    withGeo({ latitude: 43.508_176, longitude: 16.443_819 });

    expect(readIpGuess()).toEqual({ lat: 43.51, lng: 16.44 });
  });

  it("drops a guess outside the site's region", () => {
    withGeo({ latitude: 40.71, longitude: -74.0 });

    expect(readIpGuess()).toBeNull();
  });

  it("returns nothing when Netlify sends no coordinates", () => {
    withGeo({ city: "Split" });
    expect(readIpGuess()).toBeNull();

    withGeo(undefined);
    expect(readIpGuess()).toBeNull();
  });

  it("returns nothing outside a Netlify request", () => {
    vi.mocked(getContext).mockImplementation(() => {
      throw new Error("no context");
    });

    expect(readIpGuess()).toBeNull();
  });
});
