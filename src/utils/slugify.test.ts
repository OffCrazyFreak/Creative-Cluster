import { describe, expect, it } from "vitest";

import { slugify } from "./slugify";

describe("slugify", () => {
  it("handles Croatian letters", () => {
    expect(slugify("Đurđa Čačić-Šimić Žužić")).toBe(
      "djurdja-cacic-simic-zuzic",
    );
  });

  it("collapses punctuation and trims", () => {
    expect(slugify("  Art & Crafts, Ltd.  ")).toBe("art-and-crafts-ltd");
  });

  it("transliterates other scripts instead of dropping them", () => {
    expect(slugify("Київ Арт")).toBe("kiyiv-art");
    expect(slugify("Łódź")).toBe("lodz");
    expect(slugify("Straße")).toBe("strasse");
  });

  it("never returns an empty slug", () => {
    expect(slugify("!!!")).toBe("entry");
  });
});
