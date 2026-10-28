import { describe, expect, it } from "vitest";

import { entryIconId, entryInitials, parseEntryIconId } from "./entry-icon-id";

describe("entryInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(entryInitials("Zagreb design week")).toBe("ZD");
    expect(entryInitials("Studio")).toBe("S");
  });

  it("skips punctuation and keeps Croatian letters", () => {
    expect(entryInitials("(čakovec) - šuma")).toBe("ČŠ");
  });

  it("marks a name without letters or digits instead of leaving the tile blank", () => {
    expect(entryInitials("+++")).toBe("?");
  });
});

describe("entry icon ids", () => {
  it("round-trips an entry with a logo", () => {
    const icon = { initials: "ZD", logo: { id: "abc", hash: "f00" } };
    expect(parseEntryIconId(entryIconId(icon))).toEqual(icon);
  });

  it("shares one initials tile between entries without a logo", () => {
    const id = entryIconId({ initials: "ZD", logo: null });
    expect(id).toBe("entry:ZD");
    expect(parseEntryIconId(id)).toEqual({ initials: "ZD", logo: null });
  });

  it("ignores images that are not entry tiles", () => {
    expect(parseEntryIconId("selected-frame")).toBeNull();
    expect(parseEntryIconId("entry:ZD:abc")).toBeNull();
  });
});
