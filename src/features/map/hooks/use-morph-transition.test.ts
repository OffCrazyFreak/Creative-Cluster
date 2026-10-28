import { describe, expect, it } from "vitest";

import { morphTiming } from "./use-morph-transition";

describe("morphTiming", () => {
  it("opens slower than it closes", () => {
    expect(morphTiming(true, false)).toContain("400ms");
    expect(morphTiming(false, false)).toContain("200ms");
  });

  it("is instant under reduced motion", () => {
    expect(morphTiming(true, true)).toBe("none");
    expect(morphTiming(false, true)).toBe("none");
  });
});
