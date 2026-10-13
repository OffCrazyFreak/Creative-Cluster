import { describe, expect, it } from "vitest";

import { slugify } from "./slugify";

describe("slugify", () => {
  it("handles Croatian letters", () => {
    expect(slugify("Đurđa Čačić-Šimić Žužić")).toBe(
      "djurdja-cacic-simic-zuzic",
    );
  });

  it("collapses punctuation and trims", () => {
    expect(slugify("  Art & Crafts, Ltd.  ")).toBe("art-crafts-ltd");
  });
});
