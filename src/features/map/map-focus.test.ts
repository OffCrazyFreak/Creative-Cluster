import { describe, expect, it } from "vitest";

import { mapFocusSlug } from "./map-focus";

describe("mapFocusSlug", () => {
  it("centres a phone's selection only after its sheet is measured", () => {
    expect(mapFocusSlug(false, null, "studio", 0)).toBeNull();
    expect(mapFocusSlug(false, null, "studio", 220)).toBe("studio");
  });

  it("leaves a phone's map alone behind an open entry page", () => {
    expect(mapFocusSlug(false, "studio", null, 0)).toBeNull();
  });

  it("centres the open entry page on desktop", () => {
    expect(mapFocusSlug(true, "studio", "other", 0)).toBe("studio");
  });
});
