import { describe, expect, it } from "vitest";

import { isReservedSlug, normalizeSlug } from "./slug-format";

describe("normalizeSlug", () => {
  it("lowercases and trims", () => {
    expect(normalizeSlug("  Demo-Studio ")).toBe("demo-studio");
  });

  it("rejects bad formats", () => {
    for (const bad of [
      "",
      "a b",
      "dj--x",
      "-x",
      "x-",
      "đ",
      "a/b",
      "a".repeat(81),
    ])
      expect(() => normalizeSlug(bad)).toThrow("Invalid slug format");
  });

  it("rejects reserved slugs in any case", () => {
    expect(isReservedSlug("Admin")).toBe(true);
    expect(() => normalizeSlug("ADMIN")).toThrow("Slug is reserved");
  });
});
