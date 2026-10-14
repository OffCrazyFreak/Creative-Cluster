import { describe, expect, it } from "vitest";

import { checkPasswordPolicy, passwordLength } from "./password-policy";

describe("password policy", () => {
  it("accepts 12 to 128 characters with no composition rules", () => {
    expect(checkPasswordPolicy("a".repeat(12))).toBeNull();
    expect(checkPasswordPolicy("correct horse battery staple")).toBeNull();
    expect(checkPasswordPolicy("a".repeat(128))).toBeNull();
  });

  it("rejects too short and too long", () => {
    expect(checkPasswordPolicy("a".repeat(11))).toBe("too_short");
    expect(checkPasswordPolicy("a".repeat(129))).toBe("too_long");
  });

  it("counts code points on the NFKC form", () => {
    // 12 emoji are 24 UTF-16 units but 12 code points.
    expect(checkPasswordPolicy("😀".repeat(12))).toBeNull();
    expect(checkPasswordPolicy("😀".repeat(11))).toBe("too_short");
    // Fullwidth letters fold to ASCII, ligatures expand to 3 characters.
    expect(passwordLength("ＡＢＣ")).toBe(3);
    expect(passwordLength("ﬃ")).toBe(3);
  });
});
